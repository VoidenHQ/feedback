/**
 * Help content for core Voiden nodes
 */

import React from "react";

export const RuntimeVariablesHelp = () => (
  <div className="space-y-4">
    <section>
      <h3 className="font-semibold mb-2 text-text">Runtime Variables (Void Block)</h3>
      <p className="text-sm text-comment mb-3">
        Runtime Variables allow you to capture and store values from API responses, which can then be used in subsequent requests.
        This is essential for workflows where one request depends on data from a previous request.
      </p>
    </section>

    <section>
      <h4 className="font-semibold mb-2 text-text">How It Works</h4>
      <p className="text-sm text-comment mb-2">
        After a request executes, you can extract values from the response and store them as variables.
        These variables are then available for use in other requests using the <code className="bg-accent/10 px-1 rounded text-text">{`{{variable_name}}`}</code> syntax.
      </p>
    </section>

    <section>
      <h4 className="font-semibold mb-2 text-text">How to Use</h4>
      <ol className="list-decimal list-inside space-y-1 text-sm text-comment">
        <li>Add a Runtime Variables block after your request</li>
        <li>In the Key column, enter the variable name you want to create</li>
        <li>In the Value column, use JSONPath or other selectors to extract data from the response</li>
        <li>Run the request to capture the values</li>
        <li>Use the captured variables in subsequent requests with <code className="bg-accent/10 px-1 rounded text-text">{`{{variable_name}}`}</code></li>
      </ol>
    </section>

    <section>
      <h4 className="font-semibold mb-2 text-text">Common Use Cases</h4>
      <ul className="list-disc list-inside space-y-1 text-sm text-comment">
        <li>Capturing authentication tokens from login responses</li>
        <li>Storing IDs from create operations for use in update/delete requests</li>
        <li>Chaining requests where each depends on the previous response</li>
        <li>Building test workflows with dynamic data</li>
      </ul>
    </section>

    <section>
      <h4 className="font-semibold mb-2 text-text">Example</h4>
      <pre className="bg-accent/10 p-2 rounded text-xs overflow-x-auto text-text">
{`// Response from login request:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": "12345"
}

// Runtime Variables:
authToken: $.token
currentUserId: $.userId

// Use in next request:
Authorization: Bearer {{authToken}}
/api/users/{{currentUserId}}/profile`}
      </pre>
    </section>
  </div>
);
