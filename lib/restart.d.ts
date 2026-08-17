export interface RestartResult {
    scheduled: true;
}
/** Schedule a replacement host, then terminate this process after the reply. */
export declare function scheduleDshRestart(): RestartResult;
