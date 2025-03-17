/** 导入调整大小调试处理器接口 */
import ResizeDebugHandler from "./resize/ResizeDebugHandler";

/** 它基本上是所有调试处理器的容器 */
// It is basically container of all debugHandlers.

/** 调试处理器接口定义 */
export interface DebugHandlers {
    /** 
     * 调整大小调试处理器
     * 可选属性，用于处理尺寸调整相关的调试
     */
    resizeDebugHandler?: ResizeDebugHandler;
}
