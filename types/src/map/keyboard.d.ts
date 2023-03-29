export declare const listenKeyEvent: () => {
    removeEventListener: () => void;
    isAltKey: () => boolean | undefined;
    isCtrlKey: () => boolean | undefined;
    isShiftKey: () => boolean | undefined;
    curKey: () => KeyboardEvent | undefined;
};
