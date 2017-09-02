/**
 * 对bridge调用进行的封装
 * 一个完整的hybrid请求是如下:
 * 前端向客户端发送target:'config'的信息期间带上注册信息,客户端收到注册信息后向前端返回一个列表,列表是一个注册成功的方法数组.
 * 此时前端再向客户端发送target:'hybrid-method'方法,此时客户端真正了解前端的意图,开始进行一系列客户端操作,并且操作结束后调用前端挂载在window上的函数给前端回调
 * 基于上面的操作,如果直接使用bridge你将会面临2到3层的回调,这种写法在业务代码中很不优雅,所以我们将hybrid的异步进行了封装,希望能够简化这一操作流程
 */
import core from './lib/core'

function Hybrid (apiList) {
    if (Hybrid.instance) {
        return Hybrid.instance.handleApiList(apiList)
    } else if (!(this instanceof Hybrid)) {
        return new Hybrid(apiList)
    }
    Hybrid.instance = this
    this.hasPreConfigApis = [] // 已经注册过的api, 防止重复注册
    this.hybridMethods = core
    this.handleApiList(apiList)
}

Hybrid.__version__ = '0.1.0'

Hybrid.prototype.handleApiList = function handleApiList (apiList) {
    let list = []
    if (Array.isArray(apiList)) {
        list = apiList
    } else if (typeof apiList === 'string') {
        list = [apiList]
    } else if (Object.prototype.toString.call(apiList) === '[Object object]') {
        list = Object.keys(apiList)
    }
    for (let i = 0; i < list.length; i += 1) {
        this.config(list[i])
    }
    return this
}

Hybrid.prototype.config = function config (feature) {
    if (this.hasPreConfigApis.indexOf(feature) === -1 /* 防止重复注册 */) {
        // 在原型上面挂载注册的方法,方便直接调用
        /* eslint-disable func-names */
        Hybrid.prototype[feature] = function (...args) {
        /* eslint-enable */
            if (typeof core[feature] === 'function') {
                core[feature](...args)
            } else {
                // 对没有注册的hybrid方法进行注册
                core.config({
                    jsApiList: {
                        [feature]: 'optional'
                    }
                }, (err, result) => {
                    if (!err && result.length > 0) {
                        core[feature](...args)
                    } else {
                        /* eslint-disable no-console */
                        console.error(`can not find method ${feature},you can check hybird-api list`)
                        /* eslint-enable */
                    }
                })
            }
            return this
        }
    }
    return this
}

Hybrid.instance = null

Hybrid.getInstance = function getInstance () {
    if (Hybrid.instance) {
        return Hybrid.instance
    }
    return new Hybrid()
}

Hybrid.prototype.use = function use () {

}


export default Hybrid
