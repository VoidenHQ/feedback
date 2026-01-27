import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, TextSelection } from 'prosemirror-state';

const isTableCell = (node) => node.type.name === 'tableCell' || node.type.name === 'tableHeader';
const isUrlNode = (node) => node.type.name === 'url';

const findAncestorDepth = ($from, predicate) => {
    for (let depth = $from.depth; depth > 0; depth--) {
        if (predicate($from.node(depth))) {
            return depth;
        }
    }
    return null;
};

const selectNodeContent = (state, dispatch, depth) => {
    if (depth === null || depth === undefined) return false;

    const start = state.selection.$from.start(depth);
    const end = state.selection.$from.end(depth);
    const from = Math.min(start, end);
    const to = Math.max(end, from);

    if (dispatch) {
        dispatch(state.tr.setSelection(TextSelection.create(state.doc, from, to)));
    }
    return true;
};

export const cmdAll = Extension.create({
    name: 'cmdAll',
    priority: 20,
    
    addOptions() {
        return {
            debug: false, // Add debug option
        };
    },

    addProseMirrorPlugins() {
        let cmdKeyPressed = false; // Track Cmd/Ctrl state
        
        return [
            new Plugin({
                key: new PluginKey('cmdAllShortcut'),
                
                props: {
                    // Use ONLY handleDOMEvents (more reliable)
                    handleDOMEvents: {
                        // Track modifier keys
                        keydown: (view, event) => {
                            if (this.options.debug) {
                                console.log('Keydown:', {
                                    key: event.key,
                                    metaKey: event.metaKey,
                                    ctrlKey: event.ctrlKey,
                                    code: event.code
                                });
                            }
                            
                            // Track when Cmd/Ctrl is pressed
                            if (event.key === 'Meta' || event.key === 'Control') {
                                cmdKeyPressed = true;
                                return false;
                            }
                            
                            // Check for Cmd/Ctrl + A
                            const isSelectAll = 
                                (event.metaKey || event.ctrlKey || cmdKeyPressed) && 
                                (event.key === 'a' || event.key === 'A');
                            
                            if (!isSelectAll) {
                                return false;
                            }
                            
                            if (this.options.debug) {
                                console.log('Cmd+A detected!');
                            }
                            
                            const { state, dispatch } = view;
                            
                            // Table cell: select only cell content
                            const cellDepth = findAncestorDepth(state.selection.$from, isTableCell);
                            if (cellDepth !== null) {
                                event.preventDefault();
                                event.stopPropagation();
                                selectNodeContent(state, dispatch, cellDepth);
                                return true;
                            }

                            // URL node: select only the URL text
                            const urlDepth = findAncestorDepth(state.selection.$from, isUrlNode);
                            if (urlDepth !== null) {
                                event.preventDefault();
                                event.stopPropagation();
                                selectNodeContent(state, dispatch, urlDepth);
                                return true;
                            }
                            
                            // Not in table cell - let default handler handle
                            return false;
                        },
                        
                        // Reset when keys are released
                        keyup: (view, event) => {
                            if (event.key === 'Meta' || event.key === 'Control' || 
                                event.key === 'a' || event.key === 'A') {
                                cmdKeyPressed = false;
                            }
                            return false;
                        },
                        
                        // Also track blur events (user clicks away)
                        blur: () => {
                            cmdKeyPressed = false;
                            return false;
                        }
                    }
                },
            }),
        ];
    },
});