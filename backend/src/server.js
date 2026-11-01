import app from "./app.js";
import { port } from "./config/env.js";
import "./config/database.js";

app.listen(port, () => {
  console.log(`ProofPrint backend running at http://127.0.0.1:${port}`);
});
