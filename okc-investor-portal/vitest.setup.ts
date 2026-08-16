import { config } from 'dotenv'

// `.env` is the canonical file for this project — it holds every key the app
// needs. `.env.local` is listed first only so a developer who keeps local
// overrides still wins; dotenv does not overwrite a key it has already set,
// so the first file to define a key decides it. Passing a file that does not
// exist is a no-op, which is why listing both is safe.
config({ path: ['.env.local', '.env'] })
