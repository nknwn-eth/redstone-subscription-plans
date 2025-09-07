Sample Subgraph Snippets

- Goal: expose a list of payer addresses per merchant for the batch keeper.
- The batch task queries: `payers(where: { merchant: $merchant }) { address }`.

Files:

- schema.graphql: Defines a minimal Payer entity with merchant and address.
- sample-query.json: GraphQL body for axios/POST with variables.

Notes:

- Implement mappings to populate Payer entities from your app’s events (e.g. when a merchant onboards a user, or when the user subscribes on-chain).
- Ensure addresses are lowercased in the subgraph for consistent querying.

