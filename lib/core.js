/**
 * 本来是没有这个core文件的，为了全面兼容原有的bbhybrid版本，做了妥协
 */
import bridge from './bridge'

// 生成一个hybird.api的包装函数
function genFeatureFunc (feature) {
    // 把feature闭包
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
        return this
    }
}

function initCore () {
    if (window.bbhybrid) {
        return window.bbhybrid
    }
    return {
        bridge,
        config (config, onReady) {
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
                        if (typeof this[feature] !== 'function') {
                            this[feature] = genFeatureFunc(feature)
                        }
                    }
                    onReady(null, response.result)
                }
            })
        }
    }
}

const core = initCore()

export default core
