import { App } from "./app.js";
import { inversifyContainer } from "./container.js";

const app = inversifyContainer.get(App);

app.start(3000);
