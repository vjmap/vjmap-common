import type { Map } from 'vjmap'

const snapCache: Record<string, object> = {}
export const getMapSnapPoints = async (map: Map, snapObj: any, snapQueryLimit?: number) => {
    if (snapQueryLimit === 0) {
        // 不启用捕捉
        snapObj.features = []
        return;
    }
    //栅格样式去服务器获取坐标点数据
    // 栅格样式获取捕捉点
    // 查询所有坐标数据,字段含义可参考https://vjmap.com/guide/svrStyleVar.html
    const svc = map.getService();
    const mapid = svc.currentMapParam()?.mapid;
    const ver = svc.currentMapParam()?.version;
    if (!mapid) return;
    const key = `${mapid}_${ver}${svc.getCurWorkspaceName()}`;
    if (key in snapCache) {
        //@ts-ignore
        snapObj.features = [...snapCache[key].features];
        return;
    } else {
        // 去本地缓存获取
        const features = localStorage.getItem('snap_' + key);
        if (features) {
            try {
                const values = JSON.parse(features);
                if (Array.isArray(values)) {
                    //@ts-ignore
                    snapObj.features = [...values];
                    snapCache[key] = snapObj;
                    return;
                }
            // eslint-disable-next-line no-empty
            } catch (error) {
                
            }
        }
    }
    let res = await svc.conditionQueryFeature({ fields:"s3", condition:"s3 != ''", limit: snapQueryLimit ?? 100000})
    if (!res.result) return;
    res = res.result.map((e: any) => e.s3.split(";"))
    snapObj.features = []
    for(const item of res) {
        const coordinates = []
        for(const pt of item) {
            const p = pt.split(",")
            if (p.length >= 2) {
                coordinates.push(map.toLngLat([+p[0], +p[1]]))
            }
        }
        if (coordinates.length == 1) {
            snapObj.features.push({
                type: "Feature",
                geometry: {
                    type: "Point",
                    coordinates: coordinates[0]
                }
            })
        }
        else if (coordinates.length > 1) {
            snapObj.features.push({
                type: "Feature",
                geometry: {
                    type: "LineString",
                    coordinates: coordinates
                }
            })
        }
    }
    snapCache[key] = snapObj;
    try {
        localStorage.setItem('snap_' + key, JSON.stringify(snapObj.features));
    // eslint-disable-next-line no-empty
    } catch (error) {
        
    }
}