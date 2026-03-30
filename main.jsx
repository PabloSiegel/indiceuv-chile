import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import UVIndiceApp from "./uv-chile";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <UVIndiceApp />
  </StrictMode>
);
