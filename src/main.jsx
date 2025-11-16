import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "antd/dist/reset.css";
import "./theme.css";
import "./assets/css/global-responsive.css";
import dayjs from "dayjs";
import "dayjs/locale/vi";
import customParseFormat from "dayjs/plugin/customParseFormat";
import weekOfYear from "dayjs/plugin/weekOfYear";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import { ConfigProvider } from "antd";
import viVN from "antd/locale/vi_VN";

// Configure dayjs
dayjs.extend(customParseFormat);
dayjs.extend(weekOfYear);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.locale("vi");

ReactDOM.createRoot(document.getElementById("root")).render(
  <ConfigProvider locale={viVN}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </ConfigProvider>
);
