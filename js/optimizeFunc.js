function doColorization() {
    let class_number = Object.keys(labelToClass).length;
    //get the lightness range
    let lightnessRange = [+d3.select("#lightnessFilterRangeLow").property('value'), +d3.select("#lightnessFilterRangeHigh").property('value')];
    let colors_scope = { "hue_scope": [0, 360], "lumi_scope": lightnessRange };

    // check if exist locked color
    let origin_palette = [], blank_pos = [], id = 0;
    locked_pos = []
    let spans = d3.select(".paletteDiv").selectAll("span");
    if (!data_changed_sign)
        spans.each(function () {
            if (+d3.select(this).select("img").attr("isLocked") === 1) {
                origin_palette.push(d3.rgb(d3.select(this).attr("color")))
                locked_pos.push(id)
            } else {
                origin_palette.push("")
                blank_pos.push(id)
            }
            id++;
        });

    color_names_checked = collectColorNames();
    if (color_names_checked.length > 0) {
        // document.getElementById("caRatioId").checked = false;
        document.getElementById("pgRatioId").checked = true;
        generation_mode = 0;
        document.getElementById("slider_1").value = 100;
        changeSlider("slider_1", 100)
        document.getElementById("slider_2").value = 100;
        changeSlider("slider_2", 100)
    }
    color_blind_type = document.querySelector('input[name = "colorblindType"]:checked').value;

    let best_color, best_color_array = new Array(1);
    initial_scores = [-1, -1]

    if (generation_mode && color_names_checked.length === 0) {
        console.log("assignment palette");
        // get current palette
        let input_palette_text = d3.select("#inputPaletteText").property("value");
        input_palette_text = input_palette_text.replace(/\"/g, '');
        assignment_palette = input_palette_text.split("[")[1].split("]")[0].split(",");
        best_color = doColorAssignment(assignment_palette, class_number);
    } else if (blank_pos.length === 0 || blank_pos.length === class_number) {
        console.log("generate palette");
        for (let i = 0; i < best_color_array.length; i++)
            best_color_array[i] = simulatedAnnealing2FindBestPalette(class_number, colors_scope);

        best_color_array.sort(function (a, b) { return b.score - a.score })
        best_color = best_color_array[0]
    }
    else {
        console.log("complete palette");
        best_color = completePalette(origin_palette, blank_pos, colors_scope);
    }

    let used_palette = new Array(class_number);
    for (let i = 0; i < class_number; i++) {
        used_palette[i] = best_color.id[i];
    }
    // if already have a svg, then insert it to the history
    addToHistory();
    drawTransferFunction(used_palette);

    return used_palette;
}

/**
 * score the given palette
 */
function getPaletteScore(p) {
    let palette = p.slice();
    if (color_names_checked != undefined && color_names_checked.length > 0) {
        let count = 0;
        for (let i = 0; i < palette.length; i++) {
            let c = getColorNameIndex(d3.rgb(palette[i])),
                t = c3.color.relatedTerms(c, 1);
            if (t[0] === undefined || color_names_checked.indexOf(c3.terms[t[0].index]) === -1) {
                count++;
            }
        }
        if (count > 2) // if there are more than two colors that are not in selected color names, then discard this palette
            return -1000000;
    }
    if (color_blind_type != "Normal") {
        for (let i = 0; i < palette.length; i++) {
            let c = d3.rgb(palette[i]);
            let c1 = fBlind[color_blind_type]([parseInt(c.r), parseInt(c.g), parseInt(c.b)]);
            palette[i] = d3.rgb(c1[0], c1[1], c1[2]);
        }
    }
    let color_dis = new Array(palette.length)
    for (let i = 0; i < palette.length; i++)
        color_dis[i] = new Array(palette.length)
    let bg_contrast_array = new Array(palette.length)
    let name_difference = 0,
        color_discrimination_constraint = 100000;
    for (let i = 0; i < palette.length; i++) {
        for (let j = i + 1; j < palette.length; j++) {
            color_dis[i][j] = color_dis[j][i] = d3_ciede2000(d3.lab(palette[i]), d3.lab(palette[j]));
            name_difference += getNameDifference(palette[i], palette[j]);
            color_discrimination_constraint = (color_discrimination_constraint > color_dis[i][j]) ? color_dis[i][j] : color_discrimination_constraint;
        }
        bg_contrast_array[i] = d3_ciede2000(d3.lab(palette[i]), d3.lab(d3.rgb(bgcolor)));
        color_discrimination_constraint = (color_discrimination_constraint > bg_contrast_array[i]) ? bg_contrast_array[i] : color_discrimination_constraint;
    }
    let cosaliency_score = 0;
    let tmp_pd = 0, tmp_cb = 0
    for (let i = 0; i < palette.length; i++) {
        for (let j = 0; j < palette.length; j++) {
            if (i === j) continue;
            tmp_pd += alphaShape_distance[i][j] * color_dis[i][j] * Math.exp(change_distance[i]);
        }
        if (change_distance[i] > kappa)
            tmp_cb += non_separability_weights[i] * bg_contrast_array[i] * Math.exp(change_distance[i]);
        else
            tmp_cb -= non_separability_weights[i] * bg_contrast_array[i] * Math.exp(change_distance[i]);
    }
    if (initial_scores[0] === -1) {
        initial_scores[0] = tmp_pd;
        initial_scores[1] = tmp_cb;
    }
    cosaliency_score = cosaliency_lambda * tmp_pd / initial_scores[0] + (1 - cosaliency_lambda) * tmp_cb / Math.abs(initial_scores[1]);
    // console.log(tmp_pd / initial_scores[0], tmp_cb / Math.abs(initial_scores[1]), cosaliency_score);
    name_difference /= palette.length * (palette.length - 1) * 0.25;
    color_discrimination_constraint *= 0.1;
    console.log(cosaliency_score, name_difference, color_discrimination_constraint);

    return score_importance_weight[0] * cosaliency_score + score_importance_weight[1] * name_difference + score_importance_weight[2] * color_discrimination_constraint;
}

/**
 * using simulated annealing to find the best palette of given data
 * @param {*} palette_size 
 * @param {*} evaluateFunc 
 * @param {*} colors_scope: hue range, lightness range, saturation range
 * @param {*} flag 
 */
function simulatedAnnealing2FindBestPalette(palette_size, colors_scope = { "hue_scope": [0, 360], "lumi_scope": [35, 85] }, flag = true) {
    let iterate_times = 0;
    //default parameters
    let max_temper = 100000,
        dec = decline_rate,
        max_iteration_times = 10000000,
        end_temper = 0.001;
    cur_temper = max_temper;
    //generate a totally random palette
    let color_palette = getColorPaletteRandom(palette_size);
    //evaluate the default palette
    let o = {
        id: color_palette,
        score: getPaletteScore(color_palette)
    },
        preferredObj = o;

    while (cur_temper > end_temper) {
        for (let i = 0; i < 1; i++) {//disturb at each temperature
            iterate_times++;
            color_palette = o.id.slice();
            disturbColors(color_palette, colors_scope);
            let color_palette_2 = color_palette.slice();
            let o2 = {
                id: color_palette_2,
                score: getPaletteScore(color_palette_2)
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

function getColorPaletteRandom(palette_size) {
    let palette = [];
    for (let i = 0; i < palette_size; i++) {
        let rgb = d3.rgb(getRandomIntInclusive(0, 255), getRandomIntInclusive(0, 255), getRandomIntInclusive(0, 255));
        palette.push(rgb);
    }
    return palette;
}

function randomDisturbColors(palette, colors_scope) {
    let disturb_step = 50;
    // random disturb one color
    let idx = getRandomIntInclusive(0, palette.length - 1),
        rgb = d3.rgb(palette[idx]),
        color = d3.rgb(norm255(rgb.r + getRandomIntInclusive(-disturb_step, disturb_step)), norm255(rgb.g + getRandomIntInclusive(-disturb_step, disturb_step)), norm255(rgb.b + getRandomIntInclusive(-disturb_step, disturb_step))),
        hcl = d3.hcl(color);
    color = d3.rgb(d3.hcl(normScope(hcl.h, colors_scope.hue_scope), normScope(hcl.c, [0, 100]), normScope(hcl.l, colors_scope.lumi_scope)));
    palette[idx] = d3.rgb(norm255(color.r), norm255(color.g), norm255(color.b));
    let count = 0, sign;
    while (true) {
        while ((sign = isDiscriminative(palette)) > 0) {
            count += 1;
            if (count === 100) break;
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
        let satisfy_color_name = true;
        if (color_names_checked.length > 0) {
            for (let i = 0; i < palette.length; i++) {
                let c = getColorNameIndex(d3.rgb(palette[i])),
                    t = c3.color.relatedTerms(c, 1);
                if (t[0] === undefined || color_names_checked.indexOf(c3.terms[t[0].index]) === -1) {
                    rgb = best_color_names[color_names_checked[getRandomIntInclusive(0, color_names_checked.length - 1)]]
                    palette[i] = d3.rgb(norm255(rgb.r + getRandomIntInclusive(-10, 10)), norm255(rgb.g + getRandomIntInclusive(-10, 10)), norm255(rgb.b + getRandomIntInclusive(-10, 10)))
                    satisfy_color_name = false;
                }
            }
        }

        if (satisfy_color_name || count >= 100) break;
    }
}

function isDiscriminative(palette) {
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
function disturbColors(palette, colors_scope) {
    if (Math.random() < 0.5) {
        randomDisturbColors(palette, colors_scope);
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


/**
 * using simulated annealing to complete the current palette of given data
 */
function completePalette(origin_palette, blank_pos, colors_scope = { "hue_scope": [0, 360], "lumi_scope": [25, 85] }, flag = true) {
    let iterate_times = 0;
    //default parameters
    let max_temper = 100000,
        dec = decline_rate,
        max_iteration_times = 10000000,
        end_temper = 0.001;
    cur_temper = max_temper;
    //generate a totally random palette
    let color_palette = completePaletteRandom(origin_palette, blank_pos, colors_scope, true);
    //evaluate the default palette
    let o = {
        id: color_palette,
        score: getPaletteScore(color_palette)
    },
        preferredObj = o;

    while (cur_temper > end_temper) {
        for (let i = 0; i < 1; i++) {//disturb at each temperature
            iterate_times++;
            color_palette = completePaletteRandom(color_palette, blank_pos, colors_scope);
            let o2 = {
                id: color_palette,
                score: getPaletteScore(color_palette)
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

function completePaletteRandom(ori_palette, pos, colors_scope, start = false) {

    let palette = ori_palette.slice();
    if (start)
        for (let i = 0; i < pos.length; i++) {
            let rgb = d3.rgb(getRandomIntInclusive(0, 255), getRandomIntInclusive(0, 255), getRandomIntInclusive(0, 255));
            palette[pos[i]] = rgb;
        }
    else {
        if (Math.random() < 0.5) {
            let pos_colors = [], fixed_colors = [];
            for (let i = 0; i < palette.length; i++) {
                if (pos.indexOf(i) != -1)
                    pos_colors.push([palette[i], i]);
                else
                    fixed_colors.push([palette[i], i]);
            }
            let disturb_step = 50;
            // random disturb one color
            let idx = pos[getRandomIntInclusive(0, pos.length - 1)],
                rgb = d3.rgb(palette[idx]),
                color = d3.rgb(norm255(rgb.r + getRandomIntInclusive(-disturb_step, disturb_step)), norm255(rgb.g + getRandomIntInclusive(-disturb_step, disturb_step)), norm255(rgb.b + getRandomIntInclusive(-disturb_step, disturb_step))),
                hcl = d3.hcl(color);
            color = d3.rgb(d3.hcl(normScope(hcl.h, colors_scope.hue_scope), normScope(hcl.c, [0, 100]), normScope(hcl.l, colors_scope.lumi_scope)));
            palette[idx] = d3.rgb(norm255(color.r), norm255(color.g), norm255(color.b));
            let count = 0, sign;
            while (true) {
                while ((sign = isDiscriminative2(pos_colors, fixed_colors))[0] >= 0) {
                    count += 1;
                    if (count === 100) break;
                    rgb = d3.rgb(palette[sign[0]])
                    color = d3.rgb(norm255(rgb.r + getRandomIntInclusive(-disturb_step, disturb_step)), norm255(rgb.g + getRandomIntInclusive(-disturb_step, disturb_step)), norm255(rgb.b + getRandomIntInclusive(-disturb_step, disturb_step)))
                    hcl = d3.hcl(color);
                    if (hcl.h >= 85 && hcl.h <= 114 && hcl.l >= 35 && hcl.l <= 75) {
                        if (Math.abs(hcl.h - 85) > Math.abs(hcl.h - 114)) {
                            hcl.h = 115;
                        } else {
                            hcl.h = 84;
                        }
                    }
                    palette[sign[0]] = d3.rgb(d3.hcl(normScope(hcl.h, colors_scope.hue_scope), normScope(hcl.c, [0, 100]), normScope(hcl.l, colors_scope.lumi_scope)));
                    pos_colors[sign[1]] = palette[sign[0]];
                }
                let satisfy_color_name = true;
                if (color_names_checked.length > 0) {
                    for (let i = 0; i < pos.length; i++) {
                        let c = getColorNameIndex(d3.rgb(palette[pos[i]])),
                            t = c3.color.relatedTerms(c, 1);
                        if (t[0] === undefined || color_names_checked.indexOf(c3.terms[t[0].index]) === -1) {
                            rgb = best_color_names[color_names_checked[getRandomIntInclusive(0, color_names_checked.length - 1)]]
                            palette[pos[i]] = d3.rgb(norm255(rgb.r + getRandomIntInclusive(-10, 10)), norm255(rgb.g + getRandomIntInclusive(-10, 10)), norm255(rgb.b + getRandomIntInclusive(-10, 10)))
                            satisfy_color_name = false;
                        }
                    }
                }

                if (satisfy_color_name || count >= 100) break;
            }
        } else {
            // randomly shuffle two colors of the palette 
            let idx_0 = pos[getRandomIntInclusive(0, pos.length - 1)],
                idx_1 = pos[getRandomIntInclusive(0, pos.length - 1)];
            while (idx_0 === idx_1) {
                idx_1 = pos[getRandomIntInclusive(0, pos.length - 1)];
            }
            let tmp = palette[idx_0];
            palette[idx_0] = palette[idx_1];
            palette[idx_1] = tmp;
        }
    }
    return palette;
}

function isDiscriminative2(pos_colors, fixed_colors) {
    for (let i = 0; i < fixed_colors.length; i++) {
        for (let j = 0; j < pos_colors.length; j++) {
            let color_dis = d3_ciede2000(d3.lab(fixed_colors[i][0]), d3.lab(pos_colors[j][0]));
            if (color_dis < 10) {
                return [pos_colors[j][1], j];
            }
        }
    }
    for (let j = 0; j < pos_colors.length; j++) {
        for (let k = j + 1; k < pos_colors.length; k++) {
            color_dis = d3_ciede2000(d3.lab(pos_colors[j][0]), d3.lab(pos_colors[k][0]));
            if (color_dis < 10) {
                return [pos_colors[j][1], k];
            }
        }
        if (d3_ciede2000(d3.lab(pos_colors[j][0]), d3.lab(bgcolor)) < 10) {
            return [pos_colors[j][1], j];
        }
    }

    return [-1, -1];
}

/**
 * color assignment
 */
function doColorAssignment(palette, class_number) {
    let iterate_times = 0;
    //default parameters
    let max_temper = 100000,
        dec = decline_rate,
        max_iteration_times = 10000000,
        end_temper = 0.001;
    cur_temper = max_temper;
    //generate a totally random palette
    let color_palette = palette;
    //evaluate the default palette
    let o = {
        id: color_palette,
        score: getPaletteScore(color_palette.slice(0, class_number))
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
                score: getPaletteScore(color_palette.slice(0, class_number))
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




