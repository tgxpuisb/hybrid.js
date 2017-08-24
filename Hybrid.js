import bridge from './bridge'

function genFeatureFunc (feature) {
    return (...args) => {
        let data = args.shift()
        let callback = args.shift()
        if (!data) {
            data = {}
        } else if (typeof data === 'function') {
            callback = data
            data = {}
        }
        if (typeof callback !== 'function') {
            callback = () => {}
        }

        bridge.send({
            data,
            target: feature
        }, (resp) => {
            if (resp.error) {
                callback(resp.error)
            } else {
                callback(null, resp.result)
            }
        })
    }
}

function Hybrid (apiList) {
    if (Hybrid.instance) {
        return Hybrid.instance.handleApiList(apiList)
    } else if (!(this instanceof Hybrid)) {
        return new Hybrid(apiList)
    }
    Hybrid.instance = this
    this.hasPreConfigApis = []
    this.hybridMethods = {}
    this.handleApiList(apiList)
}

Hybrid.prototype.handleApiList = function handleApiList (apiList) {
    let list
    if (Array.isArray(apiList)) {
        list = apiList
    } else if (typeof apiList === 'string') {
        list = [apiList]
    } else if (Object.prototype.toString.call(apiList) === '[Object object]') {
        list = Object.keys(apiList)
    }
    for (let i = 0; i < list.length; i += 1) {
        this.preConfig(list[i])
    }

    return this
}

Hybrid.prototype.preConfig = function preConfig (feature) {
    if (this.hasPreConfigApis.indexOf(feature) === -1) {
        /* eslint-disable func-names */
        Hybrid.prototype[feature] = function (...args) {
            if (bridge) {
                if (typeof this.hybridMethods[feature] === 'function') {
                    this.hybridMethods[feature](...args)
                } else {
                    this.config({
                        jsApiList: {
                            feature: 'optional'
                        }
                    }, (err, result) => {
                        if (!err && result.length > 0) {
                            this.hybridMethods[feature](...args)
                        }
                    })
                }
            }
            return this
        }
    }
    return this
}

Object.defineProperty(Hybrid.prototype, 'config', {
    value (config, onReady) {
        if (!bridge) {
            return this
        }
        bridge.send({
            data: config,
            target: 'config'
        }, (response) => {
            if (response.error) {
                onReady(response.error)
            } else if (response.result) {
                const featureList = response.result
                for (let i = 0; i < featureList.length; i += 1) {
                    const feature = featureList[i]
                    if (typeof this.hybridMethods[feature] !== 'function') {
                        this.hybridMethods[feature] = genFeatureFunc(feature)
                    }
                    onReady(null, response.result)
                }
            }
        })
        return this
    },
    writable: false,
    configurable: false
})

Hybrid.instance = null

Hybrid.getInstance = function getInstance () {
    if (Hybrid.instance) {
        return Hybrid.instance
    }
    return new Hybrid()
}


export default Hybrid


