import { Request } from "@voiden/sdk/shared";
import { v4 } from "uuid";
import { create } from "zustand";
import { persist, createJSONStorage, StateStorage } from "zustand/middleware";
import { get, set, del } from "idb-keyval"; // can use anything: IndexedDB, Ionic Storage, etc.
import { IRequestWithHistory } from "@/schemas/history";

// this should not be used soon
export const createNewRequestObject = ({
  _id,
  tabId,
  collection_id,
  parent_id,
  name,
  method,
  url,
  params,
  headers,
  content_type,
  body,
  body_params,
  auth,
  prescript,
  postscript,
  isModified,
}: Partial<Request> = {}): Request => {
  return {
    tabId: v4(),
    _id: _id,
    collection_id: undefined,
    parent_id: undefined,
    //
    name: "Undefined", // ?
    method: method || "GET",
    url: url || "",
    path_params: [],
    params: params || [],
    headers: headers || [],
    content_type: content_type || "none",
    body: body || "",
    body_params: body_params || [],
    auth: auth || {
      enabled: false,
      type: "none",
      config: undefined,
    },
    prescript: prescript || "",
    postscript: postscript || "",
    isModified: false,
  };
};

type LoadingTab = {
  _id: string;
  tabId: string;
  name: string;
  url: string;
  method: string;
  collection_id: string;
  isModified: boolean;
};

type LoadTabParams = {
  _id: string;
  tabId: string;
  name: string;
  url: string;
  method: string;
  collection_id: string;
};

// Custom storage object
const storage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return (await get(name)) || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await set(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await del(name);
  },
};

const isLoadingTab = (tab?: Request | LoadingTab): tab is LoadingTab => {
  // if its missing properties such as params, body, etc. it is a loading tab
  return tab ? !(tab as Request).params || !(tab as Request).headers : false;
};

interface StoreState {
  activeEnvId?: string;
  upgradePopup?: string | boolean;
  config?: Record<string, any> | undefined;
  setConfig?: (config: Record<string, any>) => void;
  setUpgradePopup: (upgradePopup: string | boolean) => void;
  setActiveEnvId: (id: string | undefined) => void;
  activeProxyId: string | undefined;
  setActiveProxyId: (id: string | undefined) => void;
  history: IRequestWithHistory[];
  addHistory: (history: IRequestWithHistory) => void;
  deleteHistory: () => void;
  activeTabIndex: number;
  tabs: (Request | LoadingTab)[];
  setHistory: (history: IRequestWithHistory[]) => void;
  addTab: () => void;
  removeTab: (index: number) => void;
  clickTab: (index: number) => void;
  updateTab: (tab: Request) => void;
  duplicateTab: (index: number) => void;
  loadTab: ({ _id, tabId, name, url, method, collection_id }: LoadTabParams) => void;
  setTab: (request: Request) => void;
  setActiveTabIndex: (index: number) => void;
  setTabs: (tabs: (Request | LoadingTab)[]) => void;
  isSandboxActive: boolean;
  setIsSandboxActive: (isSandboxActive: boolean) => void;
  errorDetails: string | undefined;
  setErrorDetails: (errorDetails: string | undefined) => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      activeEnv: undefined,
      activeProxyId: undefined,
      setActiveEnvId: (activeEnvId) => set({ activeEnvId }),
      setActiveProxyId: (activeProxyId) => set({ activeProxyId }),
      errorDetails: undefined,
      setErrorDetails: (errorDetails) => set({ errorDetails }),
      isSandboxActive: localStorage.getItem("mockResponseMode") === "true",
      setIsSandboxActive: (isSandboxActive) => set({ isSandboxActive }),
      config: undefined,
      setConfig: (config) => set({ config }),
      history: [],
      addHistory: (history) => set((state) => ({ history: [...state.history, history] })),
      deleteHistory: () => set(() => ({ history: [] })),
      setHistory: (history) => set(() => ({ history })),
      activeTabIndex: 0,
      tabs: [],
      upgradePopup: false,
      setUpgradePopup: (upgradePopup: string | boolean) => set(() => ({ upgradePopup })),
      // active tab is the tab from tabs with index equal to activeTabIndex
      addTab: () =>
        set((state) => ({
          tabs: [...state.tabs, createNewRequestObject()],
          activeTabIndex: state.tabs.length,
        })),
      removeTab: (index) => {
        set((state) => ({
          tabs: state.tabs.filter((_, i) => i !== index),
          activeTabIndex: Math.min(state.activeTabIndex, state.tabs.length - 2),
        }));
      },
      clickTab: (index) => set(() => ({ activeTabIndex: index })),
      updateTab: (tab) => {
        const newTabs = [...useStore.getState().tabs];
        newTabs[useStore.getState().activeTabIndex] = tab;
        set(() => ({ tabs: newTabs }));
      },
      duplicateTab: (index: number) => {
        const newTabs = [...useStore.getState().tabs];
        newTabs.splice(index + 1, 0, {
          ...newTabs[index],
          // clear all mention of _id, parent_id, collection_id, and tabId
          _id: undefined,
          parent_id: undefined,
          collection_id: undefined,
          // set a new tabId and name
          tabId: v4(),
          name: `${newTabs[index].name} (Copy)`,
          // set isModified to true so that it appears as unsaved
          isModified: true,
        } as Request);
        set(() => ({ tabs: newTabs }));
      },
      loadTab: ({ _id, tabId, name, url, method, collection_id }: LoadTabParams) => {
        set((state) => {
          const index = state.tabs.findIndex((tab) => tab._id === _id);

          if (index === -1) {
            // If the request is not in the tabs array, add a temporary partial request as a new tab
            return {
              tabs: [
                ...state.tabs,
                {
                  _id,
                  tabId,
                  name,
                  url,
                  method,
                  collection_id,
                  isModified: false,
                },
              ],
              activeTabIndex: state.tabs.length, // Setting the new tab as active
            };
          } else {
            // If the request is already in the tabs array, activate that tab
            return { activeTabIndex: index };
          }
        });
      },
      setTab: (request) => {
        set((state) => {
          const index = state.tabs.findIndex((tab) => tab._id === request._id);

          if (index === -1) {
            // If the request is not in the tabs array, add it as a new tab
            return {
              tabs: [...state.tabs, { ...request }], // Ensuring a unique tabId for the new tab
              activeTabIndex: state.tabs.length, // Setting the new tab as active
            };
          } else {
            // If the request is already in the tabs array, activate that tab and if it is a loading tab replace it with the new request
            return {
              tabs: state.tabs.map((tab, i) => {
                if (i === index && isLoadingTab(tab)) {
                  return { ...request };
                } else {
                  return tab;
                }
              }),
              activeTabIndex: index,
            };
          }
        });
      },
      setActiveTabIndex: (index) => set(() => ({ activeTabIndex: index })),
      setTabs: (tabs) => set(() => ({ tabs })),
    }),
    {
      name: `session-${sessionStorage.getItem("x-apy-org") || "default"}`, // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => storage), // (optional) by default, 'localStorage' is used
    },
  ),
);
