/** 自定义错误类，继承自 Error */
export default class CustomError extends Error {
    /**
     * 构造函数
     * @param exception 异常对象，包含类型和消息
     */
    constructor(exception: Exception) {
        /** 调用父类构造函数，设置错误消息 */
        super(exception.message);
        /** 设置错误名称为异常类型 */
        this.name = exception.type;
    }
}

/** 异常接口定义 */
export interface Exception {
    /** 异常类型 */
    type: string;
    /** 异常消息 */
    message: string;
}
