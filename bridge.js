/**
 * 前端与客户端通信的bridge采用"发布订阅"模式实现,是前端与客户端通信的"桥梁"
 * bridge.callbacks上存放了每一次调用hybird之后的回调方法,这些回调方法通过唯一的自增mid来区分
 * Android与iOS的实现有一些差异
 * 该bridge是hybird通信规范的其中一个实现
 * 考虑到所有bridge的实现依赖于window对象上的某些单例.如果检测到项目中有其他的bridge实现,则会自动放弃自身bridge,直接采用现有的bridge
 * 但是其他bridge的实现可能并未考虑兼容性,如果其他库本bridge之后使用,则可能会造成不兼容的情况
 */
const UA = window.navigator.userAgent
const isAndroid = /android/gi.test(UA)
let mid = 1

function getBridgeInstance () {
    if (isAndroid) {
        return window.WebViewJavascriptBridge
    }
    return {}
}

function initBridge () {
    if (window.bbhybrid && window.bbhybrid.bridge) {
        return window.bbhybrid.bridge
    }

    if (UA.indexOf('Hybrid') === -1) {
        return null
    }

    const bridge = getBridgeInstance()

    if (!bridge) {
        return null
    }

    bridge.callbacks = {}
    bridge.send = function send (message, callback) {
        /* eslint-disable no-param-reassign */
        message.id = mid
        /* eslint-enable no-param-reassign */
        this.callbacks[mid] = (error, result) => {
            callback({
                error,
                result
            })
        }
        mid += 1
        this.sendMessage(
            isAndroid ? JSON.stringify(message) : message
        )
    }

    // 当客户端完成hybrid请求时会调用此方法 Android和iOS的调用情况不统一
    const actionDidFinish = function actionDidFinish (id, error, result) {
        const callback = bridge.callbacks[id]
        if (typeof callback === 'function') {
            callback(error, result)
            // 客户端hybrid回调支持reusable参数 用于前端保持callback
            if (!result || !result.resuable) {
                delete bridge.callbacks[id]
            }
        }
    }

    if (isAndroid) {
        bridge.actionDidFinish = actionDidFinish
    } else {
        window.WebViewJavascriptBridge_actionDidFinish = actionDidFinish

        // iOS的bridge是一个对其真实bridge的包装,因为两者的bridge功能和api完全不一样,所以bridge需要进行适配
        bridge.sendMessage = function sendMessage (message) {
            let realBridge = window.WebViewJavascriptBridge
            if (!realBridge && window.webkit && window.webkit.messageHandlers) {
                realBridge = window.webkit.messageHandlers.WebViewJavascriptBridge
            }
            if (realBridge) {
                realBridge.postMessage(message)
            } else {
                setTimeout(() => {
                    realBridge.postMessage(message)
                }, 17);
            }
        }
    }

    return bridge
}

const bridge = initBridge()

export default bridge
