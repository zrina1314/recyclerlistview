import { Dimension } from "../dependencies/LayoutProvider";

/** 布局监听器 */
export interface LayoutListener {
    onLayoutChange(size: Dimension): void;
}
