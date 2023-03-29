
// 获取当前的按键状态，是否按下了Ctrl、Alt或Shift键
export const listenKeyEvent = () => {
    let curEvent: KeyboardEvent | undefined;
    const keyDownEvent = (event: KeyboardEvent) => {
        curEvent = event;
    }
    // 监听键盘按下事件
    document.addEventListener("keydown", keyDownEvent);
    
    const keyupEvent = (event: KeyboardEvent) => {
        curEvent = undefined
    }
    // 监听键盘抬起事件
    document.addEventListener("keyup", keyupEvent);

    const removeEventListener = () => {
        document.removeEventListener("keydown", keyDownEvent);
        document.removeEventListener("keyup", keyupEvent);
    }

    const isAltKey = () => {
        return curEvent?.altKey
    }
    const isCtrlKey = () => {
        return curEvent?.ctrlKey
    }
    const isShiftKey = () => {
        return curEvent?.shiftKey
    }
    const curKey = () => {
        return curEvent;
    }
    return {
        removeEventListener,
        isAltKey,
        isCtrlKey,
        isShiftKey,
        curKey
    }
}