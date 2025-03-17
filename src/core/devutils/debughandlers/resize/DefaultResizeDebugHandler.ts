/** 导入尺寸接口 */
import { Dimension } from "../../../..";
/** 导入调整大小调试处理器接口 */
import ResizeDebugHandler from "./ResizeDebugHandler";

/** 默认调整大小调试处理器类 */
export default class DefaultResizeDebugHandler implements ResizeDebugHandler {
    /** 允许的尺寸放宽范围 */
    private readonly relaxation: Dimension;
    /** 当违反放宽限制时的回调函数 */
    private readonly onRelaxationViolation: (expectedDim: Dimension, actualDim: Dimension, index: number) => void;

    // Relaxation is the Dimension object where it accepts the relaxation to allow for each dimension.
    // Any of the dimension (height or width) whose value for relaxation is less than 0 would be ignored.
    /**
     * 构造函数
     * @param relaxation 尺寸放宽对象，包含允许的高度和宽度放宽值
     * @param onRelaxationViolation 违反放宽限制时的回调函数
     * 注：如果放宽值小于0，则对应的维度将被忽略不做检查
     */
    public constructor(relaxation: Dimension, onRelaxationViolation: (expectedDim: Dimension, actualDim: Dimension, index: number) => void) {
        this.relaxation = relaxation;
        this.onRelaxationViolation = onRelaxationViolation;
    }

    /**
     * 调整大小调试方法
     * @param oldDim 原始尺寸
     * @param newDim 新尺寸
     * @param index 项目索引
     */
    public resizeDebug(oldDim: Dimension, newDim: Dimension, index: number): void {
        /** 是否违反放宽限制的标志 */
        let isViolated: boolean = false;

        /** 检查高度变化是否超过允许范围 */
        if (this.relaxation.height >= 0 && Math.abs(newDim.height - oldDim.height) >= this.relaxation.height) {
            isViolated = true;
        }

        /** 检查宽度变化是否超过允许范围 */
        if (!isViolated && this.relaxation.width >= 0 && Math.abs(newDim.width - oldDim.width) >= this.relaxation.width) {
            isViolated = true;
        }

        /** 如果存在违反放宽限制的情况，调用回调函数 */
        if (isViolated) {
            this.onRelaxationViolation(oldDim, newDim, index);
        }
    }
}
