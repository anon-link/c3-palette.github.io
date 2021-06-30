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

    // get the different delta
    let pre_delta = delta_change_distance.slice();
    delta_difference = [];
    // check if exist choosed clusters
    if (choosed_emphasized_clusters.length > 0) {
        let tmp_change_distance = new Array(class_number).fill(0);
        for (let i = 0; i < choosed_emphasized_clusters.length; i++) {
            let id = +choosed_emphasized_clusters[i].attr("clusterId");
            tmp_change_distance[id] = 1;
        }
        delta_change_distance = getDeltaDistance(tmp_change_distance);
    } else {
        delta_change_distance = getDeltaDistance(change_distance);
        for (let i = 0; i < delta_change_distance.length; i++) {
            if (pre_delta[i] > 0 && delta_change_distance[i] > 0) {
                delta_difference.push(i);
            }
        }
    }

    color_names_checked = collectColorNames();
    if (color_names_checked.length > 0) {
        // document.getElementById("caRatioId").checked = false;
        document.getElementById("pgRatioId").checked = true;
        generation_mode = 0;
        document.getElementById("slider_1").value = 50;
        changeSlider("slider_1", 50)
        document.getElementById("slider_3").value = 50;
        changeSlider("slider_3", 50)
    }
    let best_color, best_color_array = new Array(1);

    // if (generation_mode && color_names_checked.length === 0) {
    //     // get current palette
    //     let palette_text = d3.select("#paletteText").property('value');
    //     palette_text = palette_text.replace(/\"/g, '');
    //     let palette = []
    //     if (palette_text)
    //         palette = palette_text.split("[")[1].split("]")[0].split(",");
    //     if ($("input[name='specified']").is(":checked") && choosed_emphasized_clusters.length > 0 && palette.length > 0) {
    //         best_color = hueConstraintSA(palette, (new_palette) => evaluatePalette(new_palette), colors_scope);
    //     } else {
    //         let input_palette_text = d3.select("#inputPaletteText").property("value");
    //         input_palette_text = input_palette_text.replace(/\"/g, '');
    //         assignment_palette = input_palette_text.split("[")[1].split("]")[0].split(",");
    //         best_color = doColorAssignment(assignment_palette, class_number, palette);
    //     }
    // } else if ($("input[name='assignName2Target']").is(":checked") && color_names_checked.length > 0) {
    //     // assign name to desired clusters
    //     best_color = specifyColorNamePalette(class_number, (new_palette) => evaluatePalette(new_palette), colors_scope);
    // }
    // else if (blank_pos.length === 0 || blank_pos.length === class_number) {
    //     for (let i = 0; i < best_color_array.length; i++)
    //         best_color_array[i] = simulatedAnnealing2FindBestPalette(class_number, (new_palette) => evaluatePalette(new_palette), colors_scope);

    //     best_color_array.sort(function (a, b) { return b.score - a.score })
    //     best_color = best_color_array[0]
    // }
    // else {
    //     best_color = completePalette(origin_palette, blank_pos, (new_palette) => evaluatePalette(new_palette), colors_scope);
    // }

    // get current palette
    let palette_text = d3.select("#paletteText").property('value');
    palette_text = palette_text.replace(/\"/g, '');
    let palette = []
    if (palette_text)
        palette = palette_text.split("[")[1].split("]")[0].split(",");
    let input_palette_text = d3.select("#inputPaletteText").property("value");
    input_palette_text = input_palette_text.replace(/\"/g, '');
    assignment_palette = input_palette_text.split("[")[1].split("]")[0].split(",");
    best_color = doColorAssignment(assignment_palette, class_number, palette);

    let used_palette = new Array(class_number);
    for (let i = 0; i < class_number; i++) {
        used_palette[i] = best_color.id[i];
    }
    let used_palette2 = new Array(class_number);
    best_color = optimizeByHsl(used_palette)
    for (let i = 0; i < class_number; i++) {
        used_palette2[i] = best_color.id[i];
    }
    // if already have a svg, then insert it to the history
    addToHistory();

    if (choosed_emphasized_clusters.length > 0) {
        for (let i = 0; i < choosed_emphasized_clusters.length; i++) {
            let id = choosed_emphasized_clusters[i].attr("id");
            d3.select("#choosedDiv").select("#" + id).style("background", used_palette[+choosed_emphasized_clusters[i].attr("clusterId")])
        }
    }
    drawTransferFunction(used_palette);
    return [used_palette, used_palette2];
}

/**
 * score the given palette
 */
let count_global = 0;
function evaluatePalette(palette) {
    if (color_names_checked != undefined && color_names_checked.length > 0 && !$("input[name='assignName2Target']").is(":checked")) {
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
    if ($("input[name='assignName2Target']").is(":checked") && color_names_checked.length > 0) {
        for (let i = 0; i < palette.length; i++) {
            if (delta_change_distance[i] <= 0) continue;
            let c = getColorNameIndex(d3.rgb(palette[i])),
                t = c3.color.relatedTerms(c, 1);
            if (t[0] === undefined || color_names_checked.indexOf(c3.terms[t[0].index]) === -1) {
                return -1000000;
            }
        }
    }


    let color_dis = new Array(palette.length)
    let bg_contrast_array = new Array(palette.length)
    let minimum_constrast_of_changed_class = 1000000;
    for (let i = 0; i < palette.length; i++) {
        color_dis[i] = new Array(palette.length)
        for (let j = 0; j < palette.length; j++) {
            if (i === j) continue;
            color_dis[i][j] = d3_ciede2000(d3.lab(palette[i]), d3.lab(palette[j]));
        }
        bg_contrast_array[i] = d3_ciede2000(d3.lab(palette[i]), d3.lab(d3.rgb(bgcolor)));
        // find the minimum background contrast 
        if (delta_change_distance[i] > 0)
            minimum_constrast_of_changed_class = (minimum_constrast_of_changed_class > bg_contrast_array[i]) ? bg_contrast_array[i] : minimum_constrast_of_changed_class;
    }

    // calcualte color distance of given palette
    let cosaliency_score = 0,
        name_difference = 0,
        color_discrimination_constraint = 100000;
    let tmp_pd = 0, tmp_cb = 0
    let dis;
    for (let i = 0; i < palette.length; i++) {
        tmp_pd = 0;
        for (let j = 0; j < palette.length; j++) {
            if (i === j) continue;
            dis = color_dis[i][j]
            tmp_pd += cosaliency_distance[i][j] * dis;
            name_difference += getNameDifference(palette[i], palette[j]);
            color_discrimination_constraint = (color_discrimination_constraint > dis) ? dis : color_discrimination_constraint;
        }
        dis = bg_contrast_array[i]
        color_discrimination_constraint = (color_discrimination_constraint > dis) ? dis : color_discrimination_constraint;
        tmp_cb = delta_change_distance[i] * dis;
        cosaliency_score += (1 - score_importance_weight[0]) * tmp_pd * 10 + score_importance_weight[0] * tmp_cb;
        // console.log((1 - score_importance_weight[0]) * tmp_pd * 10, score_importance_weight[0] * tmp_cb);
        // if (delta_change_distance[i] <= 0 && dis > minimum_constrast_of_changed_class) {
        //     return -100000;
        // }
    }
    if (color_discrimination_constraint === 0) {
        return -10000;
    }

    if (criterion_cd === -1)
        criterion_cd = Math.abs(cosaliency_score);
    cosaliency_score /= criterion_cd;
    name_difference /= palette.length * (palette.length - 1) * 0.25;

    // console.log("--------------------------------------", criterion_cd, cosaliency_score);

    // console.log(cosaliency_score, score_importance_weight[1] * name_difference, score_importance_weight[3] * 0.1 * color_discrimination_constraint);
    return (cosaliency_score + score_importance_weight[1] * name_difference + score_importance_weight[3] * 0.1 * color_discrimination_constraint);
}

/**
 * using simulated annealing to find the best palette of given data
 * @param {*} palette_size 
 * @param {*} evaluateFunc 
 * @param {*} colors_scope: hue range, lightness range, saturation range
 * @param {*} flag 
 */
function simulatedAnnealing2FindBestPalette(palette_size, evaluateFunc, colors_scope = { "hue_scope": [0, 360], "lumi_scope": [35, 85] }, flag = true) {
    let iterate_times = 0;
    //default parameters
    let max_temper = 100000,
        dec = decline_rate,
        max_iteration_times = 10000000,
        end_temper = 0.001;
    cur_temper = max_temper;
    //generate a totally random palette
    let color_palette = getColorPaletteRandom(palette_size);
    criterion_cd = -1.0;
    //evaluate the default palette
    let o = {
        id: color_palette,
        score: evaluateFunc(color_palette)
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
                score: evaluateFunc(color_palette_2)
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
function completePalette(origin_palette, blank_pos, evaluateFunc, colors_scope = { "hue_scope": [0, 360], "lumi_scope": [25, 85] }, flag = true) {
    let iterate_times = 0;
    //default parameters
    let max_temper = 100000,
        dec = decline_rate,
        max_iteration_times = 10000000,
        end_temper = 0.001;
    cur_temper = max_temper;
    //generate a totally random palette
    let color_palette = completePaletteRandom(origin_palette, blank_pos, colors_scope, true);
    criterion_cd = -1.0;
    //evaluate the default palette
    let o = {
        id: color_palette,
        score: evaluateFunc(color_palette)
    },
        preferredObj = o;

    while (cur_temper > end_temper) {
        for (let i = 0; i < 1; i++) {//disturb at each temperature
            iterate_times++;
            color_palette = completePaletteRandom(color_palette, blank_pos, colors_scope);
            let o2 = {
                id: color_palette,
                score: evaluateFunc(color_palette)
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

function doColorAssignment(palette, class_number, pre_palette) {
    let iterate_times = 0;
    //default parameters
    let max_temper = 100000,
        dec = decline_rate,
        max_iteration_times = 10000000,
        end_temper = 0.001;
    cur_temper = max_temper;
    //generate a totally random palette
    let color_palette = palette;
    if (pre_palette.length > 0 && $("input[name='specified']").is(":checked"))
        for (let i = delta_difference.length - 1; i >= 0; i--) {
            // color_palette.splice(delta_difference[i], 0, pre_palette[delta_difference[i]])
            color_palette[delta_difference[i]] = pre_palette[delta_difference[i]]
        }
    criterion_cd = -1.0;
    //evaluate the default palette
    let o = {
        id: color_palette,
        score: _evaluatePaletteTmp(color_palette.slice(0, class_number))
    },
        preferredObj = o;

    let tmpA = []
    for (let i = 0; i < class_number; i++) {
        if (delta_difference[i] != i) {
            tmpA.push(i);
        }
    }

    while (cur_temper > end_temper) {
        for (let i = 0; i < 1; i++) {//disturb at each temperature
            iterate_times++;
            color_palette = o.id.slice();
            let idx_0, idx_1;
            // randomly shuffle two colors of the palette 
            if ($("input[name='specified']").is(":checked")) {
                idx_0 = tmpA[getRandomIntInclusive(0, tmpA.length - 1)];
                idx_1 = tmpA[getRandomIntInclusive(0, tmpA.length - 1)];
                while (idx_0 === idx_1) {
                    idx_1 = tmpA[getRandomIntInclusive(0, tmpA.length - 1)];
                }
                if (Math.random() < 0.5) {
                    idx_0 = tmpA[getRandomIntInclusive(0, tmpA.length - 1)];
                    idx_1 = getRandomIntInclusive(class_number, color_palette.length - 1);
                }
            } else {
                idx_0 = getRandomIntInclusive(0, class_number - 1);
                idx_1 = getRandomIntInclusive(0, class_number - 1);
                while (idx_0 === idx_1) {
                    idx_1 = getRandomIntInclusive(0, class_number - 1);
                }
                if (Math.random() < 0.5) {
                    idx_0 = getRandomIntInclusive(0, class_number - 1);
                    idx_1 = getRandomIntInclusive(class_number, color_palette.length - 1);
                }
            }

            let tmp = color_palette[idx_0];
            color_palette[idx_0] = color_palette[idx_1];
            color_palette[idx_1] = tmp;
            let o2 = {
                id: color_palette,
                score: _evaluatePaletteTmp(color_palette.slice(0, class_number))
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
 * using simulated annealing to specify color name to desired classes
 */
function specifyColorNamePalette(palette_size, evaluateFunc, colors_scope = { "hue_scope": [0, 360], "lumi_scope": [25, 85] }) {
    let iterate_times = 0;
    //default parameters
    let max_temper = 100000,
        dec = decline_rate,
        max_iteration_times = 10000000,
        end_temper = 0.001;
    cur_temper = max_temper;

    // split to changed and changeless
    let changed_part = [], changeless_part = [];
    for (let i = 0; i < delta_change_distance.length; i++) {
        if (delta_change_distance[i] > 0) {
            changed_part.push(i)
        } else {
            changeless_part.push(i)
        }
    }

    //generate a totally random palette
    let color_palette = getColorPaletteRandom(palette_size);//Tableau_10_palette.slice(0, palette_size);
    // shuffle(color_palette)
    color_palette = specifyColorNamePaletteRandom(color_palette, changed_part, changeless_part, colors_scope);
    criterion_cd = -1.0;
    //evaluate the default palette
    let o = {
        id: color_palette,
        score: evaluateFunc(color_palette)
    },
        preferredObj = o;

    while (cur_temper > end_temper) {
        for (let i = 0; i < 1; i++) {//disturb at each temperature
            iterate_times++;
            color_palette = specifyColorNamePaletteRandom(color_palette, changed_part, changeless_part, colors_scope);
            let o2 = {
                id: color_palette,
                score: evaluateFunc(color_palette)
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

function specifyColorNamePaletteRandom(ori_palette, changed_part, changeless_part, colors_scope) {

    let palette = ori_palette.slice();

    if (Math.random() < 0.5) {
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
                let tmp_checked = color_names_checked.slice();
                for (let i = 0; i < changed_part.length; i++) {
                    let c = getColorNameIndex(d3.rgb(palette[changed_part[i]])),
                        t = c3.color.relatedTerms(c, 1);
                    if (t[0] === undefined || tmp_checked.indexOf(c3.terms[t[0].index]) === -1) {
                        rgb = best_color_names[tmp_checked[getRandomIntInclusive(0, tmp_checked.length - 1)]]
                        palette[changed_part[i]] = d3.rgb(norm255(rgb.r + getRandomIntInclusive(-10, 10)), norm255(rgb.g + getRandomIntInclusive(-10, 10)), norm255(rgb.b + getRandomIntInclusive(-10, 10)))
                        satisfy_color_name = false;
                    }
                    if (t[0] != undefined && tmp_checked.length > 1) {
                        tmp_checked.splice(tmp_checked.indexOf(c3.terms[t[0].index]), 1);
                    }
                }
            }

            if (satisfy_color_name || count >= 100) break;
        }
    } else {
        // randomly shuffle two colors of the palette 
        let idx_0, idx_1, choosed_part;
        if (Math.random() < 0.5 && changed_part.length > 1 || changeless_part.length <= 1) {
            choosed_part = changed_part;
        } else {
            choosed_part = changeless_part;
        }

        idx_0 = choosed_part[getRandomIntInclusive(0, choosed_part.length - 1)];
        idx_1 = choosed_part[getRandomIntInclusive(0, choosed_part.length - 1)];
        while (idx_0 === idx_1) {
            idx_1 = choosed_part[getRandomIntInclusive(0, choosed_part.length - 1)];
        }
        let tmp = palette[idx_0];
        palette[idx_0] = palette[idx_1];
        palette[idx_1] = tmp;
    }

    return palette;
}

/**
 * the hue of the selected clusters does not change, disturb saturation and light to make it pop out
 */
function hueConstraintGeneration(ori_palette, changed_part, changeless_part, colors_scope) {
    let palette = ori_palette.slice();

    if (Math.random() < 0.5) {
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
            for (let i = 0; i < changed_part.length; i++) {
                let c0 = getColorNameIndex(d3.rgb(ori_palette[changed_part[i]])),
                    t0 = c3.color.relatedTerms(c0, 1);
                let c = getColorNameIndex(d3.rgb(palette[changed_part[i]])),
                    t = c3.color.relatedTerms(c, 1);
                if (t[0] === undefined || c3.terms[t[0].index] != c3.terms[t0[0].index]) {
                    rgb = best_color_names[c3.terms[t0[0].index]]
                    palette[changed_part[i]] = d3.rgb(norm255(rgb.r + getRandomIntInclusive(-10, 10)), norm255(rgb.g + getRandomIntInclusive(-10, 10)), norm255(rgb.b + getRandomIntInclusive(-10, 10)))
                    satisfy_color_name = false;
                }
            }

            if (satisfy_color_name || count >= 100) break;
        }
    } else {
        // randomly shuffle two colors of the palette 
        idx_0 = changeless_part[getRandomIntInclusive(0, changeless_part.length - 1)];
        idx_1 = changeless_part[getRandomIntInclusive(0, changeless_part.length - 1)];
        while (idx_0 === idx_1) {
            idx_1 = changeless_part[getRandomIntInclusive(0, changeless_part.length - 1)];
        }
        let tmp = palette[idx_0];
        palette[idx_0] = palette[idx_1];
        palette[idx_1] = tmp;
    }

    return palette;
}

function hueConstraintSA(palette, evaluateFunc, colors_scope = { "hue_scope": [0, 360], "lumi_scope": [25, 85] }) {
    let iterate_times = 0;
    //default parameters
    let max_temper = 100000,
        dec = decline_rate,
        max_iteration_times = 10000000,
        end_temper = 0.001;
    cur_temper = max_temper;

    // split to changed and changeless
    let changed_part = [], changeless_part = [];
    for (let i = 0; i < delta_change_distance.length; i++) {
        if (delta_change_distance[i] > 0) {
            changed_part.push(i)
        } else {
            changeless_part.push(i)
        }
    }

    //generate a totally random palette
    let color_palette = palette.slice();
    criterion_cd = -1.0;
    //evaluate the default palette
    let o = {
        id: color_palette,
        score: evaluateFunc(color_palette)
    },
        preferredObj = o;

    while (cur_temper > end_temper) {
        for (let i = 0; i < 1; i++) {//disturb at each temperature
            iterate_times++;
            color_palette = hueConstraintGeneration(color_palette, changed_part, changeless_part, colors_scope);
            let o2 = {
                id: color_palette,
                score: evaluateFunc(color_palette)
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

let _evaluatePaletteTmp = function (p) {
    let color_dis = new Array(p.length)
    let bg_contrast_array = new Array(p.length)
    for (let i = 0; i < p.length; i++) {
        color_dis[i] = new Array(p.length)
        for (let j = 0; j < p.length; j++) {
            if (i === j) continue;
            color_dis[i][j] = d3_ciede2000(d3.lab(p[i]), d3.lab(p[j]));
        }
        bg_contrast_array[i] = d3_ciede2000(d3.lab(p[i]), d3.lab(d3.rgb(bgcolor)));
    }
    let cosaliency_score = 0;
    let tmp_pd = 0, tmp_cb = 0
    for (let i = 0; i < p.length; i++) {
        for (let j = 0; j < p.length; j++) {
            if (i === j) continue;
            tmp_pd += alphaShape_distance[i][j] * color_dis[i][j] * Math.exp(change_distance[i]) / p.length;
        }
        tmp_cb += delta_change_distance[i] * bg_contrast_array[i] * background_distance[i] / p.length;
    }
    if (initial_scores[0] === -1) {
        initial_scores[0] = tmp_pd;
        initial_scores[1] = tmp_cb;
        cosaliency_score = 1;
    } else {
        cosaliency_score = (1 - score_importance_weight[0]) * tmp_pd / initial_scores[0] + score_importance_weight[0] * tmp_cb / Math.abs(initial_scores[1]);
    }

    // console.log(tmp_pd / initial_scores[0], tmp_cb / initial_scores[1], cosaliency_score);

    // if (criterion_cd === -1)
    //     criterion_cd = Math.abs(cosaliency_score);
    // cosaliency_score /= criterion_cd;
    // console.log(cosaliency_score);
    return cosaliency_score;
}
let _isNotSameColorName = function (c_origin, c_change) {
    let c0 = getColorNameIndex(c_origin),
        t0 = c3.color.relatedTerms(c0, 1);
    let c1 = getColorNameIndex(c_change),
        t1 = c3.color.relatedTerms(c1, 1);
    if (t0[0] === undefined || t1[0] === undefined || c3.terms[t1[0].index] != c3.terms[t0[0].index]) {
        // console.log(c_origin, c_change, t0[0], t1[0]);
        return true;
    } else {
        return false;
    }
}

/**
 * 
 * @param {*} c 
 * target: 
 * 1. larger color discrimination constraint: baseline is larger than 10, if all<10, then choose the largest
 * 2. most similar color name
 * 3. smaller or larger contrast to the background compared with original color
 */
let _findBestSuitableColor = function (c, origin, isHighlight) {
    let min_nd = 100000, result = c;
    let bg_contrast = d3_ciede2000(d3.lab(origin), d3.lab(d3.rgb(bgcolor)))
    // get new color through saturation
    let color = d3.hsl(c.h, (0 + c.s) / 2, c.l)
    let nd = getNameDifference(color, origin);
    if (nd < min_nd) {
        min_nd = nd;
        result = color;
    }
    let contrast = d3_ciede2000(d3.lab(color), d3.lab(d3.rgb(bgcolor)))
    console.log(1, nd, contrast, bg_contrast);
    if (nd < 0.5 && (isHighlight && contrast >= bg_contrast || !isHighlight && contrast <= bg_contrast)) {
        return color;
    }
    color = d3.hsl(c.h, (c.s + 1) / 2, c.l)
    nd = getNameDifference(color, origin);
    if (nd < min_nd) {
        min_nd = nd;
        result = color;
    }
    contrast = d3_ciede2000(d3.lab(color), d3.lab(d3.rgb(bgcolor)))
    console.log(2, nd, contrast, bg_contrast);
    if (nd < 0.5 && (isHighlight && contrast >= bg_contrast || !isHighlight && contrast <= bg_contrast)) {
        return color;
    }
    // get new color through luminance
    color = d3.hsl(c.h, c.s, (c.l + 0) / 2)
    nd = getNameDifference(color, origin);
    if (nd < min_nd) {
        min_nd = nd;
        result = color;
    }
    contrast = d3_ciede2000(d3.lab(color), d3.lab(d3.rgb(bgcolor)))
    console.log(3, nd, contrast, bg_contrast);
    if (nd < 0.5 && (isHighlight && contrast >= bg_contrast || !isHighlight && contrast <= bg_contrast)) {
        return color;
    }
    color = d3.hsl(c.h, c.s, (c.l + 1) / 2)
    nd = getNameDifference(color, origin);
    if (nd < min_nd) {
        min_nd = nd;
        result = color;
    }
    contrast = d3_ciede2000(d3.lab(color), d3.lab(d3.rgb(bgcolor)))
    console.log(4, nd, contrast, bg_contrast);
    if (nd < 0.5 && (isHighlight && contrast >= bg_contrast || !isHighlight && contrast <= bg_contrast)) {
        return color;
    }

    console.log(min_nd);

    return result;
}

function optimizeByHsl(palette, isColorBlindness) {
    // convert palette to HSL format
    let _palette = [];
    for (let c of palette) {
        _palette.push(d3.hsl(c));
    }
    console.log(_palette);

    // calcualte color distance of given palette
    let color_dis = new Array(_palette.length)
    for (let i = 0; i < _palette.length; i++)
        color_dis[i] = new Array(_palette.length)
    let bg_contrast_array = new Array(_palette.length)
    let color_discrimination_constraint = 100000;
    for (let i = 0; i < _palette.length; i++) {
        for (let j = i + 1; j < _palette.length; j++) {
            color_dis[i][j] = color_dis[j][i] = d3_ciede2000(d3.lab(_palette[i]), d3.lab(_palette[j]));
        }
        bg_contrast_array[i] = d3_ciede2000(d3.lab(_palette[i]), d3.lab(d3.rgb(bgcolor)));
    }
    // split to changed and changeless
    let changed_part = [], changeless_part = [];
    for (let i = 0; i < delta_change_distance.length; i++) {
        if (delta_change_distance[i] > 0) {
            changed_part.push(i)
        } else {
            changeless_part.push(i)
        }
    }

    let _evaluatePalette = function (p) {

        let cosaliency_score = 0;
        let tmp_pd = 0, tmp_cb = 0
        for (let i = 0; i < p.length; i++) {
            for (let j = 0; j < p.length; j++) {
                if (i === j) continue;
                tmp_pd += alphaShape_distance[i][j] * color_dis[i][j] * Math.exp(change_distance[i]) / p.length;
            }
            tmp_cb += delta_change_distance[i] * bg_contrast_array[i] * background_distance[i] / p.length;
        }
        if (initial_scores[0] === -1) {
            initial_scores[0] = tmp_pd;
            initial_scores[1] = tmp_cb;
            cosaliency_score = 1;
        } else {
            cosaliency_score = (1 - score_importance_weight[0]) * tmp_pd / initial_scores[0] + score_importance_weight[0] * tmp_cb / Math.abs(initial_scores[1]);
        }
        console.log(tmp_pd / initial_scores[0], tmp_cb / Math.abs(initial_scores[1]), cosaliency_score);
        return cosaliency_score;
    }
    let _optimizeSL = function () {
        let iterate_times = 0;
        //default parameters
        let max_temper = 100000,
            dec = decline_rate,
            max_iteration_times = 10000000,
            end_temper = 0.001;
        cur_temper = max_temper;

        let color_palette = _palette.slice();
        criterion_cd = -1.0;
        initial_scores = [-1, -1]
        //evaluate the default palette
        let o = {
            id: color_palette,
            score: _evaluatePalette(color_palette)
        },
            preferredObj = o;

        let lineChart_data = [];
        lineChart_data.push({
            id: iterate_times,
            score: o.score
        });
        while (cur_temper > end_temper) {
            for (let i = 0; i < 1; i++) {//disturb at each temperature
                iterate_times++;
                // copy the palette
                color_palette_cur = o.id.slice();
                // get disturb index
                let disturb_index = getRandomIntInclusive(0, color_palette_cur.length - 1)
                color_palette_cur[disturb_index] = _findBestSuitableColor(color_palette_cur[disturb_index], _palette[disturb_index], changed_part.indexOf(disturb_index) >= 0 ? true : false)

                let o2 = {
                    id: color_palette_cur,
                    score: _evaluatePalette(color_palette_cur)
                };
                lineChart_data.push({
                    id: iterate_times,
                    score: o2.score
                });

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
        drawLineChart(lineChart_data, "linechart")
        return preferredObj;
    }

    return _optimizeSL();
}