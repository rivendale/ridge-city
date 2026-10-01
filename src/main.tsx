import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RidgeCity } from "./game/RidgeCity";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RidgeCity />
  </StrictMode>,
);
