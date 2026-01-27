/**
 * Help content for Simple Assertions extension
 */

import React from "react";

export const SimpleAssertionsHelp = () => (
  <div className="space-y-4">
    <section>
      <h3 className="font-semibold mb-2 text-text">Simple Assertions Table</h3>
      <p className="text-sm text-comment mb-3">
        Assertions allow you to automatically validate HTTP response data to ensure your API
        is returning the expected results. Each row in the table defines one assertion test.
      </p>
    </section>

    <section>
      <h4 className="font-semibold mb-2 text-text">Table Columns</h4>
      <div className="space-y-2 text-sm text-comment">
        <div>
          <strong className="text-text opacity-100">Description:</strong> A human-readable description of what the assertion tests (optional but recommended)
        </div>
        <div>
          <strong className="text-text opacity-100">Field:</strong> The field path to test (e.g., <code className="bg-accent/10 px-1 rounded text-text">status</code>, <code className="bg-accent/10 px-1 rounded text-text">body.user.id</code>)
        </div>
        <div>
          <strong className="text-text opacity-100">Operator:</strong> The comparison operator (e.g., equals, contains, greater-than)
        </div>
        <div>
          <strong className="text-text opacity-100">Expected Value:</strong> The value to compare against
        </div>
      </div>
    </section>

    <section>
      <h4 className="font-semibold mb-2 text-text">Available Fields</h4>
      <ul className="list-disc list-inside space-y-1 text-sm text-comment">
        <li><code className="bg-accent/10 px-1 rounded text-text">status</code> - HTTP status code (e.g., 200, 404)</li>
        <li><code className="bg-accent/10 px-1 rounded text-text">statusText</code> - HTTP status text (e.g., "OK", "Not Found")</li>
        <li><code className="bg-accent/10 px-1 rounded text-text">responseTime</code> - Response time in milliseconds</li>
        <li><code className="bg-accent/10 px-1 rounded text-text">header.HeaderName</code> - Access response headers (e.g., header.Content-Type)</li>
        <li><code className="bg-accent/10 px-1 rounded text-text">body</code> - Full response body</li>
        <li><code className="bg-accent/10 px-1 rounded text-text">body.path.to.field</code> - Nested JSON fields using dot notation</li>
        <li><code className="bg-accent/10 px-1 rounded text-text">body.array[0]</code> - Array elements using bracket notation</li>
      </ul>
    </section>

    <section>
      <h4 className="font-semibold mb-2 text-text">Supported Operators</h4>
      <div className="space-y-2 text-sm">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <strong className="text-text opacity-100">Equality:</strong>
            <div className="text-comment text-xs">
              <code className="bg-accent/10 px-1 rounded text-text">equals</code>, <code className="bg-accent/10 px-1 rounded text-text">not-equals</code>
            </div>
          </div>
          <div>
            <strong className="text-text opacity-100">String Matching:</strong>
            <div className="text-comment text-xs">
              <code className="bg-accent/10 px-1 rounded text-text">contains</code>, <code className="bg-accent/10 px-1 rounded text-text">starts-with</code>, <code className="bg-accent/10 px-1 rounded text-text">ends-with</code>, <code className="bg-accent/10 px-1 rounded text-text">matches</code> (regex)
            </div>
          </div>
          <div>
            <strong className="text-text opacity-100">Numeric Comparison:</strong>
            <div className="text-comment text-xs">
              <code className="bg-accent/10 px-1 rounded text-text">greater-than</code>, <code className="bg-accent/10 px-1 rounded text-text">less-than</code>, <code className="bg-accent/10 px-1 rounded text-text">greater-equal</code>, <code className="bg-accent/10 px-1 rounded text-text">less-equal</code>
            </div>
          </div>
          <div>
            <strong className="text-text opacity-100">Existence:</strong>
            <div className="text-comment text-xs">
              <code className="bg-accent/10 px-1 rounded text-text">exists</code>, <code className="bg-accent/10 px-1 rounded text-text">not-exists</code>
            </div>
          </div>
          <div>
            <strong className="text-text opacity-100">Empty Checks:</strong>
            <div className="text-comment text-xs">
              <code className="bg-accent/10 px-1 rounded text-text">is-empty</code>, <code className="bg-accent/10 px-1 rounded text-text">not-empty</code>
            </div>
          </div>
          <div>
            <strong className="text-text opacity-100">Boolean:</strong>
            <div className="text-comment text-xs">
              <code className="bg-accent/10 px-1 rounded text-text">is-truthy</code>, <code className="bg-accent/10 px-1 rounded text-text">is-falsy</code>
            </div>
          </div>
          <div>
            <strong className="text-text opacity-100">Type:</strong>
            <div className="text-comment text-xs">
              <code className="bg-accent/10 px-1 rounded text-text">type-is</code> (string, number, boolean, object, array)
            </div>
          </div>
        </div>
      </div>
    </section>

    <section>
      <h4 className="font-semibold mb-2 text-text">Example Assertions</h4>
      <div className="space-y-2">
        <div className="bg-accent/10 p-2 rounded text-xs">
          <div className="font-semibold mb-1 text-text">Status Code Check:</div>
          <div className="text-comment">Field: <code>status</code> | Operator: <code>equals</code> | Expected: <code>200</code></div>
        </div>
        <div className="bg-accent/10 p-2 rounded text-xs">
          <div className="font-semibold mb-1 text-text">Response Time Check:</div>
          <div className="text-comment">Field: <code>responseTime</code> | Operator: <code>less-than</code> | Expected: <code>1000</code></div>
        </div>
        <div className="bg-accent/10 p-2 rounded text-xs">
          <div className="font-semibold mb-1 text-text">Header Check:</div>
          <div className="text-comment">Field: <code>header.Content-Type</code> | Operator: <code>contains</code> | Expected: <code>json</code></div>
        </div>
        <div className="bg-accent/10 p-2 rounded text-xs">
          <div className="font-semibold mb-1 text-text">JSON Field Check:</div>
          <div className="text-comment">Field: <code>body.user.email</code> | Operator: <code>matches</code> | Expected: <code>.*@.*\.com</code></div>
        </div>
        <div className="bg-accent/10 p-2 rounded text-xs">
          <div className="font-semibold mb-1 text-text">Array Length Check:</div>
          <div className="text-comment">Field: <code>body.items</code> | Operator: <code>not-empty</code> | Expected: <code>true</code></div>
        </div>
        <div className="bg-accent/10 p-2 rounded text-xs">
          <div className="font-semibold mb-1 text-text">Nested Object Check:</div>
          <div className="text-comment">Field: <code>body.data[0].id</code> | Operator: <code>exists</code> | Expected: <code>true</code></div>
        </div>
      </div>
    </section>

    <section>
      <h4 className="font-semibold mb-2 text-text">How It Works</h4>
      <ol className="list-decimal list-inside space-y-1 text-sm text-comment">
        <li>Add assertion rows to the table before sending your request</li>
        <li>Send the HTTP request normally</li>
        <li>Assertions are automatically evaluated against the response</li>
        <li>Results are displayed showing which assertions passed or failed</li>
        <li>Failed assertions show the actual vs expected values</li>
      </ol>
    </section>

    <section>
      <h4 className="font-semibold mb-2 text-text">Tips</h4>
      <ul className="list-disc list-inside space-y-1 text-sm text-comment">
        <li>The header row (Description, Field, Operator, Expected Value) is read-only</li>
        <li>Use descriptive names to make test results easier to understand</li>
        <li>Combine multiple assertions to thoroughly validate responses</li>
        <li>Use <code className="bg-accent/10 px-1 rounded text-text">exists</code> to check if optional fields are present</li>
        <li>Use <code className="bg-accent/10 px-1 rounded text-text">matches</code> with regex for complex string validation</li>
        <li>Chain assertions to test multiple aspects of the same response</li>
      </ul>
    </section>

    <section>
      <h4 className="font-semibold mb-2 text-text">Common Patterns</h4>
      <pre className="bg-accent/10 p-2 rounded text-xs overflow-x-auto text-text">
{`# Validate successful API call
status | equals | 200
responseTime | less-than | 2000

# Validate JSON structure
body.success | equals | true
body.data | exists | true
body.data | not-empty | true

# Validate user data
body.user.email | matches | ^[^@]+@[^@]+\\.[^@]+$
body.user.age | greater-than | 0
body.user.active | equals | true`}
      </pre>
    </section>
  </div>
);
