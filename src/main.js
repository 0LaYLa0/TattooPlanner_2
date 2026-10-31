import "./style.css";
import { initTabs } from "./ui/tabs.js";
import { initLibrary } from "./ui/library.js";
import { initLayers } from "./ui/layers.js";
import { initEditPanel } from "./ui/edit.js";
import { initUpload } from "./ui/upload.js";
import { initText } from "./ui/text.js";
import { initTopbar } from "./ui/topbar.js";
import { subscribe } from "./state.js";
import { initViewer } from "./viewer/viewer.js";

initTabs();
initLibrary();
initLayers();
initEditPanel();
initUpload();
initText();
initTopbar();
initViewer();
