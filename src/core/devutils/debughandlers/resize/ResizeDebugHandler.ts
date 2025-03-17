/** 导入尺寸接口定义 */
import { Dimension } from "../../../..";

/** 调整大小调试处理器接口定义 */
export default interface ResizeDebugHandler {
    /**
     * 调整大小调试方法
     * @param oldDim 原始尺寸
     * @param newDim 新尺寸
     * @param index 项目索引
     */
    resizeDebug(oldDim: Dimension, newDim: Dimension, index: number): void;
}
