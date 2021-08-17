/**
 * calculate the points render order of the given scatterplot
 */
class RenderOrder {
    constructor(data, radius, svgWidth, svgHeight) {
        this._data = data;
        this._gridWidth = radius * 1.414;
        this._svgWidth = svgWidth;
        this._svgHeight = svgHeight;
    }

    get orderedData() {
        return this.calc();
    }

    calc() {
        let xValue = d => d.x, yValue = d => d.y;
        let xScale = d3.scaleLinear().range([0, this._svgWidth]), // value -> display
            xMap = function (d) {
                return xScale(xValue(d));
            };
        let yScale = d3.scaleLinear().range([this._svgHeight, 0]), // value -> display
            yMap = function (d) {
                return yScale(yValue(d));
            };
        xScale.domain(d3.extent(this._data, xValue));
        yScale.domain(d3.extent(this._data, yValue));

        // split the svg to grid
        let x_grid = Math.ceil(this._svgWidth / this._gridWidth),
            y_grid = Math.ceil(this._svgHeight / this._gridWidth);
        let hash_table = {};
        // first loop used to get the hash table 
        let point, x_id, y_id;
        for (let i = 0; i < this._data.length; i++) {
            point = this._data[i]
            x_id = Math.floor(xMap(point) / this._gridWidth)
            y_id = Math.floor(yMap(point) / this._gridWidth)
            if (!hash_table[x_id * y_grid + y_id]) hash_table[x_id * y_grid + y_id] = []
            hash_table[x_id * y_grid + y_id].push(point)
        }
        // console.log(hash_table);
        let area_width = 6;
        let all_points = []
        // second loop used to determine the order
        for (let i = 0; i < x_grid; i += area_width) {
            for (let j = 0; j < y_grid; j += area_width) {
                // 1. get the density of each class in local area
                let local_points_values = {}
                let existed_points_grid = {}
                for (let m = 0; m < area_width; m++) {
                    for (let n = 0; n < area_width; n++) {
                        let id = (i + m) * y_grid + j + n
                        if (hash_table[id] === undefined) continue;
                        if (existed_points_grid[id] === undefined) existed_points_grid[id] = {}
                        for (let k = 0; k < hash_table[id].length; k++) {
                            if (!local_points_values[+hash_table[id][k].label]) local_points_values[+hash_table[id][k].label] = 0
                            local_points_values[+hash_table[id][k].label] += 1
                            if (!existed_points_grid[id][+hash_table[id][k].label]) existed_points_grid[id][+hash_table[id][k].label] = []
                            existed_points_grid[id][+hash_table[id][k].label].push(hash_table[id][k])
                        }
                    }
                }
                // 2. calculate how many points should each class preserve
                let existed_points_length = Object.keys(existed_points_grid).length
                // console.log("existed_points_length", existed_points_length);
                if (existed_points_length === 0) continue
                let preserved_points_number = {}
                // console.log("local_points_values", local_points_values);
                let s = this.sumObj(local_points_values)
                while (s[0] > existed_points_length - Object.keys(preserved_points_number).length) {
                    // remove value <= 1
                    for (let i in local_points_values) {
                        if (local_points_values[i] <= 1) {
                            if (Object.keys(preserved_points_number).length < existed_points_length)
                                preserved_points_number[i] = 1
                            delete local_points_values[i]
                        }
                    }
                    // devide by min points value
                    for (let i in local_points_values) {
                        let v = Math.floor(local_points_values[i] / s[1])
                        local_points_values[i] = (v <= 1) ? 1 : v
                    }
                    s = this.sumObj(local_points_values)
                }
                for (let i in local_points_values) {
                    preserved_points_number[i] = (existed_points_length - Object.keys(preserved_points_number).length) * local_points_values[i] / s[0]
                    preserved_points_number[i] = Math.floor(preserved_points_number[i])
                    preserved_points_number[i] = (preserved_points_number[i] <= 1) ? 1 : preserved_points_number[i]
                }
                // if existed points grid is not filled:
                s = this.sumObj(preserved_points_number)
                if (s[0] < existed_points_length) {
                    preserved_points_number[s[2]] += existed_points_length - s[0]
                }
                // console.log("preserved_points_number", preserved_points_number);

                // 3. assign points to each existed_points_grid: the strategy is simple that assign fewer class first
                let top_points = [];
                // let order = this.calcAssignOrder(existed_points_grid);
                // for (let i = 0; i < order.length; i++) {
                //     // class id: order[i][0]
                //     // grid id: order[i][1][n][0]
                //     for (let j = 0; j < preserved_points_number[order[i][0]]; j++) {
                //         if (j === order[i][1].length) break;
                //         if (existed_points_grid[order[i][1][j][0]][order[i][0]].length === 0) break;
                //         top_points.push(existed_points_grid[order[i][1][j][0]][order[i][0]].shift())
                //     }
                // }
                // remain the border
                let class_id = {}
                for (let id in existed_points_grid) {
                    let tmp = Object.keys(existed_points_grid[id])
                    let total_len = 0
                    for (let l in existed_points_grid[id]) total_len += existed_points_grid[id][l].length
                    for (let i = 0; i < tmp.length; i++) {
                        if (!class_id[tmp[i]]) class_id[tmp[i]] = [];
                        class_id[tmp[i]].push([id, existed_points_grid[id][tmp[i]].length / total_len])
                    }
                }
                for (let i in class_id) {
                    class_id[i].sort((a, b) => (b[1] - a[1])) // 将同一类在不同格子中的密度进行排序,大的在前, 即优先选择密度大的格子
                }
                // 先分配点少的类
                let sorted_preserved_points_number = []
                for (let id in preserved_points_number) {
                    sorted_preserved_points_number.push([id, preserved_points_number[id]])
                }
                sorted_preserved_points_number.sort((a, b) => (a[1] - b[1]))
                let used_grid = []
                for (let c of sorted_preserved_points_number) {
                    for (let j = 0; j < c[1]; j++) {
                        if (j === class_id[c[0]].length) break; // 某类允许保留两个点,但区域内只有一个网格内有该点,那么只分配一个,多余的跳过
                        if (used_grid.indexOf(class_id[c[0]][j][0]) != -1) continue; // 如果格子已被占用
                        if (!(c[0] in existed_points_grid[class_id[c[0]][j][0]]) || existed_points_grid[class_id[c[0]][j][0]][c[0]].length === 0) break; // 如果待分配的网格中某类没有点, 那么跳过
                        top_points.push(existed_points_grid[class_id[c[0]][j][0]][c[0]].shift()) // 分配点后将该点从候选中删除
                        used_grid.push(class_id[c[0]][j][0]) //格子标记为已占用
                    }
                }

                // console.log("existed_points_grid", existed_points_grid);
                // 4. collect all the points
                for (let id in existed_points_grid) {
                    for (let c in existed_points_grid[id]) {
                        all_points = all_points.concat(existed_points_grid[id][c])
                    }
                }
                all_points = all_points.concat(top_points.reverse())
                // console.log(top_points);
            }
        }
        // console.log(`all_points`, all_points);
        return all_points;
    }

    sumObj(obj) {
        let s = 0, min = 100000000, max = -1000000, max_id = 0;
        for (let i in obj) {
            s += obj[i]
            if (obj[i] > 1) {
                min = (min > obj[i]) ? obj[i] : min;
                if (max < obj[i]) {
                    max = obj[i]
                    max_id = i
                }
            }

        }
        return [s, min, max_id];
    }

    calcAssignOrder(existed_points_grid) {
        let order = [], class_id = {}
        for (let id in existed_points_grid) {
            let tmp = Object.keys(existed_points_grid[id])
            for (let i = 0; i < tmp.length; i++) {
                if (!class_id[tmp[i]]) class_id[tmp[i]] = [];
                class_id[tmp[i]].push([id, existed_points_grid[id][tmp[i]].length])
            }
        }
        for (let i in class_id) {
            class_id[i].sort((a, b) => (b[1] - a[1])) // 先分配有最大类密度的格子
            order.push([i, class_id[i]])
        }
        // console.log("order", order);
        // 先分配占据格子少的类
        order.sort((a, b) => (a[1].length - b[1].length))
        return order
    }
}