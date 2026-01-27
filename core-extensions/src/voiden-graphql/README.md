# Voiden GraphQL Extension

GraphQL client for Voiden with schema file importer and visual query builder UI. Build queries by selecting operations and fields from your schema, or write them manually with variable support.

## Features

- **Schema File Importer**: Load .graphql/.gql schema files and parse them
- **Visual Query Builder UI**: Select operations and fields through a dedicated interface
- **Field-Level Arguments**: Select arguments for both operations and individual fields
- **Automatic Variable Generation**: Variables are auto-generated based on selected arguments
- **Query Execution**: Execute GraphQL queries with full variable support
- **Mutations**: Perform GraphQL mutations with variable support
- **Subscriptions**: Real-time subscription event tracking
- **Variables Editor**: JSON editor for GraphQL variables with validation
- **Response Visualization**: Response rendering with error highlighting
- **Depends on voiden-rest-api**: Uses REST API extension for URL handling and request execution

## Usage

### Insert GraphQL Query Block

Use the `/gqlquery` slash command to insert a GraphQL query block:

```
/gqlquery
```

This creates a GraphQL query editor where you can:
- Manually write your query, mutation, or subscription
- Use the schema importer to build queries visually

### Insert GraphQL Variables Block

Use the `/gqlvariables` slash command to add a variables block:

```
/gqlvariables
```

This creates a JSON editor for defining variables used in your query.

### Load a Schema File

1. In the GraphQL Query block, click the "Select schema file" button (folder icon)
2. Choose a `.graphql` or `.gql` schema file from your file system
3. The schema will be parsed and displayed in the viewer

### Build Queries Visually

1. After loading a schema, click the Eye icon to enter viewer mode
2. You'll see tabs for Query, Mutation, and Subscription operations
3. Check the checkbox next to operations you want to include
4. Click the expand button (▶) to see operation details and fields
5. Select the fields you want to include in your query
6. For fields with arguments, select which arguments to use
7. The query is auto-generated with proper variable definitions

### URL Endpoint

The GraphQL extension depends on the **voiden-rest-api** extension for URL handling. Use the standard URL block from the REST API extension to specify your GraphQL endpoint.

## GraphQL Request Structure

A typical GraphQL request in Voiden consists of:

1. **URL Block** (`url`) - from voiden-rest-api
   - The GraphQL endpoint URL
   - Example: `https://api.example.com/graphql`

2. **Query Block** (`gqlquery`)
   - Your GraphQL query, mutation, or subscription
   - Syntax highlighted code editor
   - Schema importer with visual query builder
   - Operation type selector (query/mutation/subscription)
   - Schema viewer with tabs for different operation types

3. **Variables Block** (`gqlvariables`) - Optional
   - JSON object with variables
   - Example:
   ```json
   {
     "userId": "123",
     "limit": 10
   }
   ```

4. **Subscription Events Block** (`gqlsubscriptionevents`) - Automatic for subscriptions
   - Tracks real-time subscription events
   - Displays incoming subscription data

## Example Queries

### Building a Query with Schema Importer

Given this schema:
```graphql
type User {
  id: ID!
  name: String!
  posts(limit: Int, published: Boolean): [Post!]!
}

type Query {
  user(id: ID!): User
}
```

**Steps:**
1. Load the schema file
2. Switch to viewer mode (Eye icon)
3. Select operation: `user`
4. Select fields: `id`, `name`, `posts`
5. For the `posts` field, select arguments: `limit`, `published`

**Generated Query:**
```graphql
query User($id: ID!, $user_posts_limit: Int, $user_posts_published: Boolean) {
  user(id: $id) {
    id
    name
    posts(limit: $user_posts_limit, published: $user_posts_published) {
      id
      title
    }
  }
}
```

### Manual Query Writing

You can also write queries manually in the editor:

```graphql
query {
  user(id: "123") {
    name
    email
    posts {
      title
      createdAt
    }
  }
}
```

### Query with Variables

```graphql
query GetUser($userId: ID!, $limit: Int) {
  user(id: $userId) {
    name
    posts(limit: $limit) {
      title
    }
  }
}
```

Variables:
```json
{
  "userId": "123",
  "limit": 10
}
```

### Mutation

```graphql
mutation CreatePost($title: String!, $content: String!) {
  createPost(input: {
    title: $title
    content: $content
  }) {
    id
    title
    createdAt
  }
}
```

### Subscription

```graphql
subscription OnPostCreated {
  postCreated {
    id
    title
    author {
      name
    }
  }
}
```

## Response Format

GraphQL responses are rendered in a structured format:

1. **Status Bar**
   - HTTP status code
   - Response time
   - Error indicator (if GraphQL errors present)

2. **Errors Section** (if present)
   - GraphQL error messages
   - Error paths
   - Line/column locations

3. **Data Section**
   - Formatted JSON response data
   - Syntax highlighted
   - Collapsible structure

4. **Extensions Section** (if present)
   - Additional metadata from the server

## Pipeline Integration

The GraphQL extension integrates with Voiden's request pipeline:

### Request Build Hook
- Extracts GraphQL query and variables from editor blocks
- Builds POST request with JSON body
- Sets appropriate Content-Type header
- Delegates actual request execution to voiden-rest-api

### Response Processing Hook
- Parses GraphQL response structure
- Separates data, errors, and extensions
- Displays formatted response

### Streaming Handler
- Manages real-time subscription connections
- Tracks subscription events in dedicated block

## Block Types

The extension registers these block types:

- `gqlquery` - GraphQL query/mutation/subscription editor with schema importer
- `gqlvariables` - Variables JSON editor
- `gqlsubscriptionevents` - Real-time subscription events tracker

## Slash Commands

- `/gqlquery` - Insert GraphQL Query block
- `/gqlvariables` - Insert GraphQL Variables block

## Schema Importer Features

### Variable Naming Convention
- **Operation arguments**: `$argName`
- **Field arguments**: `$operationName_fieldName_argName`
  - This prevents naming conflicts when multiple operations/fields use similar argument names

### Supported Operation Types
- **Query**: Select from available query operations
- **Mutation**: Select from available mutation operations  
- **Subscription**: Select from available subscription operations

### Field Selection
- Expand operations to see their return type fields
- Select which fields to include in the query
- For fields with arguments, choose which arguments to pass
- Nested field selection for complex types

## Advanced Features

### Authentication
Use the voiden-rest-api headers block or voiden-advanced-auth extension to add authentication:

```
Insert a headers-table block (from REST API extension) above your query with:
Authorization: Bearer YOUR_TOKEN_HERE
```

## Error Handling

The extension provides detailed error information:

- **Network Errors**: HTTP-level failures from the request execution
- **GraphQL Errors**: Application-level errors with paths and locations
- **Schema Parsing Errors**: Issues loading or parsing schema files
- **Validation Errors**: Variable validation issues

## Tips

1. Load a schema file to use the visual query builder
2. Use the schema viewer to explore available operations and fields
3. Field-level argument selection helps build complex queries
4. Variables are automatically generated based on your selections
5. Switch between viewer mode and editor mode as needed
6. Use voiden-rest-api blocks (URL, headers) for endpoint configuration
7. Subscriptions require WebSocket support on the server

## Dependencies

This extension depends on:
- **voiden-rest-api**: For URL handling and HTTP request execution
- All GraphQL requests are sent as POST requests via the REST API pipeline

## Test Schema

A test schema file is included at:
```
/core-extensions/src/voiden-graphql/test-schema.graphql
```

This schema includes:
- Operations with arguments
- Types with fields that have arguments
- Nested types for comprehensive testing

Use this to test the schema importer and query builder features!

## Technical Details

- Built on Voiden's extensible SDK
- Integrates with voiden-rest-api for request execution
- Uses TipTap for rich text editing
- React-based UI components
- Full TypeScript support
- GraphQL schema parsing utilities
- Field and operation argument tracking
