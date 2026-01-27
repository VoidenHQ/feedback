/**
 * Document Types
 *
 * Note: These types may have cloud-specific properties that are not used in desktop mode
 */

export type DbDocument = {
  id: string;
  parent_id: string | null;
  title: string | null;
  doc_type?: "generic" | "request" | "file";
  doc_order: number;
  updated_by: string;
  updated_at: string;
  deleted_at?: string;
  search_text?: string;
  owned_by: string;
  ownership: string;
  data?: string;
  voidenSchema?: {
    name: string;
    description: string;
    request: any | null;
  };
  openApiSpecs?: any;
  created_by?: string;
  locked_by?: string;
  locked_at?: string;
  published_at?: string;
  postman_collection_url?: string;
  source_document_id?: string;
  source_reference_url?: string;
};

export type EditorDocument = DbDocument & {
  children: EditorDocument[];
};

export interface DocumentTree {
  id: string;
  parent_id: string | null;
  title: string | null;
  children: DocumentTree[];
  doc_order: number;
  updated_by: string;
  updated_at: string;
  search_text?: string;
  owned_by: string;
  ownership: string;
}
