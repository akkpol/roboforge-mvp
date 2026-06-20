import "@fontsource/rajdhani/latin-500.css";
import "@fontsource/rajdhani/latin-600.css";
import "@fontsource/rajdhani/latin-700.css";
import "@fontsource/noto-sans-thai/thai-400.css";
import "@fontsource/noto-sans-thai/thai-600.css";
import { render } from "preact";
import { App } from "./App";
import "./styles.css";

render(<App />, document.getElementById("root")!);
