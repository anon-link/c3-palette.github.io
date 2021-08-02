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
        let hash_table = new Array(x_grid * y_grid);
        // first loop used to get the hash table 
        let point, x_id, y_id;
        for (let i = 0; i < this._data.length; i++) {
            point = this._data[i]
            x_id = Math.floor(point.x / this._gridWidth)
            y_id = Math.floor(point.y / this._gridWidth)
            if (hash_table[x_id * y_grid + y_id]) hash_table[x_id * y_grid + y_id] = []
            hash_table[x_id * y_grid + y_id].push(point)
        }
        let top_points = new Array(x_grid * y_grid);
        // second loop used to determine the order
        for (let i = 0; i < x_grid; i += 4) {
            for (let j = 0; j < y_grid; j += 4) {
                // get the density of each class in local area
                let local_points = new Array(8).fill(0);
                for (let m = 0; m < 4; m++) {
                    for (let n = 0; n < 4; n++) {
                        let id = (i + m) * y_grid + j + n
                        if (hash_table[id] === undefined) continue;
                        for (let k = 0; k < hash_table[id].length; k++)
                            local_points[+hash_table[id][k].label] += 1
                    }
                }
                // now calculate how many points should each class preserve
                let preserved_points_number = new Array(8).fill(0);
                for (let k = 0; k < local_points.length; k++) {
                    preserved_points_number[k] = Math.floor(local_points[k] / 16);
                }



            }
        }

    }
}