class C3Palette {
    constructor(data, class_number, weights, width, height, palette) {
        this.data = data;
        this.classNumber = class_number;
        this.weights = weights;
        this.width = width;
        this.height = height;
        this.givenPalette = palette;

        this.alphaShape_distance = [];
        this.non_separability_weights = [];
        this.change_distance = []
        this.cluster_nums = null
        this.initial_scores = [-1, -1]
        this.kappa = 0
    }

    get run() {
        return this.calcPalette();
    }

    calcPalette() {
        // set the ranges
        let xScale = d3.scaleBand()
            .range([0, this.width])
            .padding(0.1);
        let yScale = d3.scaleLinear()
            .range([this.height, 0]);

        xScale.domain([0, 1, 2, 3, 4, 5, 6]);
        yScale.domain([0, 1]);

        this.alphaShape_distance = new Array(this.classNumber);
        for (let i = 0; i < this.classNumber; i++) {
            this.alphaShape_distance[i] = new Array(this.classNumber).fill(0);
        }
        this.non_separability_weights = new Array(this.classNumber).fill(0);
        this.change_distance = new Array(this.classNumber).fill(0);
        for (let m = 0; m < this.data.length; m++) {
            //bar chart
            let baryCenter = new Array(this.classNumber);
            for (let d of this.data[m]) {
                baryCenter[d.x] = [xScale(d.x) + xScale.bandwidth() / 2, svg_height / 2 + yScale(d.y) / 2]
            }
            // only nearest two bars have a distance
            for (let i = 0; i < this.classNumber - 1; i++) {
                let dist = Math.sqrt((baryCenter[i][0] - baryCenter[i + 1][0]) * (baryCenter[i][0] - baryCenter[i + 1][0]) + (baryCenter[i][1] - baryCenter[i + 1][1]) * (baryCenter[i][1] - baryCenter[i + 1][1]));
                this.alphaShape_distance[i][i + 1] += inverseFunc(dist + 1);
                this.non_separability_weights[i] += 1 / baryCenter[i][1];
            }
            this.non_separability_weights[this.classNumber - 1] += 1 / baryCenter[this.classNumber - 1][1];
        }
        console.log("alphaShape_distance:", this.alphaShape_distance);
        console.log("non_separability_weights:", this.non_separability_weights);

        // find the biggest difference
        let id = 0, largest_diff = -100000000;
        for (let i = 0; i < this.data[0].length; i++) {
            let diff = Math.abs(this.data[0][i].y - this.data[1][i].y)
            if (largest_diff < diff) {
                largest_diff = diff
                id = +this.data[0][i].x
            }
        }
        this.change_distance[id] = 1;
        console.log("change_distance", this.change_distance);

        for (let i = 0; i < this.classNumber; i++) {
            for (let j = 0; j < this.classNumber; j++) {
                if (i === j) continue;
                this.alphaShape_distance[i][j] *= Math.exp(this.change_distance[i]);
            }
            this.non_separability_weights[i] *= Math.exp(this.change_distance[i]);
        }

        let colors_scope = { "hue_scope": [0, 360], "lumi_scope": [35, 95] };
        let best_color;
        if (this.givenPalette) {
            best_color = this.doColorAssignment(this.givenPalette, this.classNumber)
        } else {
            best_color = this.simulatedAnnealing2FindBestPalette(this.classNumber, colors_scope);
        }


        let palette = new Array(this.classNumber);
        for (let i = 0; i < this.classNumber; i++) {
            palette[i] = best_color.id[i];
        }
        return palette;
    }


    evaluatePalette(p) {
        let color_dis = new Array(p.length)
        for (let i = 0; i < p.length; i++)
            color_dis[i] = new Array(p.length)
        let bg_contrast_array = new Array(p.length)
        let name_difference = 0,
            color_discrimination_constraint = 100000;
        for (let i = 0; i < p.length; i++) {
            for (let j = i + 1; j < p.length; j++) {
                color_dis[i][j] = color_dis[j][i] = d3_ciede2000(d3.lab(p[i]), d3.lab(p[j]));
                name_difference += getNameDifference(p[i], p[j]);
                color_discrimination_constraint = (color_discrimination_constraint > color_dis[i][j]) ? color_dis[i][j] : color_discrimination_constraint;
            }
            bg_contrast_array[i] = d3_ciede2000(d3.lab(p[i]), d3.lab(d3.rgb(bgcolor)));
            color_discrimination_constraint = (color_discrimination_constraint > bg_contrast_array[i]) ? bg_contrast_array[i] : color_discrimination_constraint;
        }
        let cosaliency_score = 0;
        let tmp_pd = 0, tmp_cb = 0
        for (let i = 0; i < p.length; i++) {
            for (let j = 0; j < p.length; j++) {
                if (i === j) continue;
                tmp_pd += this.alphaShape_distance[i][j] * color_dis[i][j];
            }
            if (this.change_distance[i] > this.kappa)
                tmp_cb += this.non_separability_weights[i] * bg_contrast_array[i];
            else
                tmp_cb -= this.non_separability_weights[i] * bg_contrast_array[i];
        }
        if (this.initial_scores[0] === -1) {
            this.initial_scores[0] = tmp_pd;
            this.initial_scores[1] = tmp_cb;
            console.log(this.initial_scores);
        }
        let lam = 0.1;
        cosaliency_score = lam * tmp_pd / this.initial_scores[0] + (1 - lam) * tmp_cb / Math.abs(this.initial_scores[1]);
        // console.log(tmp_pd / this.initial_scores[0], tmp_cb / Math.abs(this.initial_scores[1]), cosaliency_score);
        name_difference /= p.length * (p.length - 1) * 0.25;
        color_discrimination_constraint *= 0.1;
        // console.log(cosaliency_score, name_difference, color_discrimination_constraint);

        return this.weights[0] * cosaliency_score + this.weights[1] * name_difference + this.weights[2] * color_discrimination_constraint;

    }

    doColorAssignment(palette, class_number) {
        let iterate_times = 0;
        //default parameters
        let max_temper = 100000,
            dec = 0.99,
            max_iteration_times = 10000000,
            end_temper = 0.001;
        let cur_temper = max_temper;
        //generate a totally random palette
        let color_palette = palette;
        //evaluate the default palette
        let o = {
            id: color_palette,
            score: this.evaluatePalette(color_palette.slice(0, class_number))
        },
            preferredObj = o;

        while (cur_temper > end_temper) {
            for (let i = 0; i < 1; i++) {//disturb at each temperature
                iterate_times++;
                color_palette = o.id.slice();
                let idx_0, idx_1;
                // randomly shuffle two colors of the palette 
                idx_0 = getRandomIntInclusive(0, class_number - 1);
                idx_1 = getRandomIntInclusive(0, class_number - 1);
                while (idx_0 === idx_1) {
                    idx_1 = getRandomIntInclusive(0, class_number - 1);
                }
                if (Math.random() < 0.5) {
                    idx_0 = getRandomIntInclusive(0, class_number - 1);
                    idx_1 = getRandomIntInclusive(class_number + 1, color_palette.length - 1);
                }

                let tmp = color_palette[idx_0];
                color_palette[idx_0] = color_palette[idx_1];
                color_palette[idx_1] = tmp;
                let o2 = {
                    id: color_palette,
                    score: this.evaluatePalette(color_palette.slice(0, class_number))
                };

                let delta_score = o.score - o2.score;
                if (delta_score <= 0 || delta_score > 0 && Math.random() <= Math.exp((-delta_score) / cur_temper)) {
                    o = o2;
                    if (preferredObj.score - o.score < 0) {
                        preferredObj = o;
                    }
                }
                if (iterate_times > max_iteration_times) {
                    break;
                }
            }

            cur_temper *= dec;
        }

        return preferredObj;
    }

    /**
     * using simulated annealing to find the best palette of given data
     * @param {*} palette_size 
     * @param {*} evaluateFunc 
     * @param {*} colors_scope: hue range, lightness range, saturation range
     * @param {*} flag 
     */
    simulatedAnnealing2FindBestPalette(palette_size, colors_scope = { "hue_scope": [0, 360], "lumi_scope": [35, 85] }) {
        let iterate_times = 0;
        //default parameters
        let max_temper = 100000,
            dec = 0.99,
            max_iteration_times = 10000000,
            end_temper = 0.001;
        let cur_temper = max_temper;
        //generate a totally random palette
        let color_palette = this.getColorPaletteRandom(palette_size);
        //evaluate the default palette
        let o = {
            id: color_palette,
            score: this.evaluatePalette(color_palette)
        },
            preferredObj = o;

        while (cur_temper > end_temper) {
            for (let i = 0; i < 1; i++) {//disturb at each temperature
                iterate_times++;
                color_palette = o.id.slice();
                this.disturbColors(color_palette, colors_scope);
                let color_palette_2 = color_palette.slice();
                let o2 = {
                    id: color_palette_2,
                    score: this.evaluatePalette(color_palette_2)
                };

                let delta_score = o.score - o2.score;
                if (delta_score <= 0 || delta_score > 0 && Math.random() <= Math.exp((-delta_score) / cur_temper)) {
                    o = o2;
                    if (preferredObj.score - o.score < 0) {
                        preferredObj = o;
                    }
                }
                if (iterate_times > max_iteration_times) {
                    break;
                }
            }

            cur_temper *= dec;
        }

        return preferredObj;
    }

    getColorPaletteRandom(palette_size) {
        let palette = [];
        for (let i = 0; i < palette_size; i++) {
            let rgb = d3.rgb(getRandomIntInclusive(0, 255), getRandomIntInclusive(0, 255), getRandomIntInclusive(0, 255));
            palette.push(rgb);
        }
        return palette;
    }

    randomDisturbColors(palette, colors_scope) {
        let disturb_step = 50;
        // random disturb one color
        let idx = getRandomIntInclusive(0, palette.length - 1),
            rgb = d3.rgb(palette[idx]),
            color = d3.rgb(norm255(rgb.r + getRandomIntInclusive(-disturb_step, disturb_step)), norm255(rgb.g + getRandomIntInclusive(-disturb_step, disturb_step)), norm255(rgb.b + getRandomIntInclusive(-disturb_step, disturb_step))),
            hcl = d3.hcl(color);
        color = d3.rgb(d3.hcl(normScope(hcl.h, colors_scope.hue_scope), normScope(hcl.c, [0, 100]), normScope(hcl.l, colors_scope.lumi_scope)));
        palette[idx] = d3.rgb(norm255(color.r), norm255(color.g), norm255(color.b));
        let count = 0, sign;
        while ((sign = this.isDiscriminative(palette)) > 0) {
            count += 1;
            if (count >= 100) break;
            rgb = d3.rgb(palette[sign])
            color = d3.rgb(norm255(rgb.r + getRandomIntInclusive(-disturb_step, disturb_step)), norm255(rgb.g + getRandomIntInclusive(-disturb_step, disturb_step)), norm255(rgb.b + getRandomIntInclusive(-disturb_step, disturb_step)))
            hcl = d3.hcl(color);
            if (hcl.h >= 85 && hcl.h <= 114 && hcl.l >= 35 && hcl.l <= 75) {
                if (Math.abs(hcl.h - 85) > Math.abs(hcl.h - 114)) {
                    hcl.h = 115;
                } else {
                    hcl.h = 84;
                }
            }
            palette[sign] = d3.rgb(d3.hcl(normScope(hcl.h, colors_scope.hue_scope), normScope(hcl.c, [0, 100]), normScope(hcl.l, colors_scope.lumi_scope)));
        }
    }

    isDiscriminative(palette) {
        for (let i = 0; i < palette.length; i++) {
            for (let j = i + 1; j < palette.length; j++) {
                let color_dis = d3_ciede2000(d3.lab(palette[i]), d3.lab(palette[j]));
                if (color_dis < 10) {
                    return j;
                }
            }
            if (d3_ciede2000(d3.lab(palette[i]), d3.lab(bgcolor)) < 10) {
                return i;
            }
        }
        return -1;
    }

    /**
     * only use color discrimination
     * @param {} palette 
     * @param {*} colors_scope 
     */
    disturbColors(palette, colors_scope) {
        if (Math.random() < 0.5) {
            this.randomDisturbColors(palette, colors_scope);
        } else {
            // randomly shuffle two colors of the palette 
            let idx_0 = getRandomIntInclusive(0, palette.length - 1),
                idx_1 = getRandomIntInclusive(0, palette.length - 1);
            while (idx_0 === idx_1) {
                idx_1 = getRandomIntInclusive(0, palette.length - 1);
            }
            let tmp = palette[idx_0];
            palette[idx_0] = palette[idx_1];
            palette[idx_1] = tmp;
        }
    }

}