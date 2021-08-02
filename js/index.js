// Co-Saliency based Palette Generation for multiple multi-class scatterplots

d3.select(".operationDiv").style('pointer-events', "none");

document.querySelector('.instructions-container > div:last-child').onclick = () => {
  document.querySelector('.instructions-container').classList.add('hide')
}
function showHelp() {
  document.querySelector('.instructions-container').classList.remove('hide')
}

if (!getCookie("Palettailor")) {
  setCookie("Palettailor", 1, 30);
  console.log(document.cookie);
  document.querySelector('.instructions-container').classList.remove('hide');
}


function changeSlider(name, value) {
  let label_value = value / 100;
  switch (name) {
    case "slider_0":
      document.getElementById("slider_0_label").innerText = label_value.toFixed(2);
      score_importance_weight[0] = label_value;
      break;
    case "slider_1":
      document.getElementById("slider_1_label").innerText = label_value.toFixed(2);
      score_importance_weight[1] = label_value;
      break;
    case "slider_2":
      document.getElementById("slider_2_label").innerText = label_value.toFixed(2);
      score_importance_weight[2] = label_value;
      delta_change_distance = getDeltaDistance(change_distance);
      break;
    case "slider_3":
      document.getElementById("slider_3_label").innerText = label_value.toFixed(2);
      score_importance_weight[3] = label_value;
      break;
    case "slider_4":
      document.getElementById("slider_4_label").innerText = label_value.toFixed(2);
      changeAlpha(label_value);
      break;
    default:

  }
}

$("input[name='generationMode']").change(function () {
  if ($(this).val() === "paletteGeneration") {
    d3.select("#inputDiv").style("display", "none");
    generation_mode = 0;
    document.getElementById("slider_1").value = 50;
    changeSlider("slider_1", 50)
    document.getElementById("slider_3").value = 25;
    changeSlider("slider_3", 25)
  } else {
    d3.select("#inputDiv").style("display", "inline-block");
    generation_mode = 1;
    document.getElementById("slider_1").value = 0;
    changeSlider("slider_1", 0)
    document.getElementById("slider_3").value = 0;
    changeSlider("slider_3", 0)
  }
});

$("input[name='popout']").change(function () {
  delta_change_distance = getDeltaDistance(change_distance);
});

c3.load("js/lib/c3_data.json");
for (var c = 0; c < c3.color.length; ++c) {
  var x = c3.color[c];
  color_name_map[[x.L, x.a, x.b].join(",")] = c;
}

function addToHistory() {
  let svgs = d3.select("#renderDiv").selectAll("svg");
  if (svgs._groups[0].length > 0) {
    let li = d3.select(".historyList").append("li")
      .attr("data-palette", d3.select("#paletteText").attr('data-palette'))
      .style('cursor', 'pointer')
      .on("click", function () {
        addToHistory();
        let svg = d3.select(this).selectAll("svg");
        svg.each(function () {
          d3.select(this).attr("width", SVGWIDTH).attr("height", SVGHEIGHT);
          d3.select("#renderDiv").node().appendChild(d3.select(this).node());
        });
        let rect = d3.select(this).selectAll(".rect");
        rect.each(function () {
          d3.select(".paletteDiv").node().appendChild(d3.select(this).node());
        });
        d3.select(this).remove();
        var result = d3.select(this),
          palette = result.attr('data-palette').split(';');
        palette = palette.map(function (c) {
          return d3.lab(c);
        });
        outputPalette(palette);
      });
    let div = li.append("div").attr("class", "screenshot");
    svgs.each(function () {
      d3.select(this).attr("width", 80).attr("height", 80)
        .attr("preserveAspectRatio", "xMinYMin meet")
        .attr("viewBox", "0 0 " + SVGWIDTH + " " + SVGHEIGHT);
      // li.node().appendChild(d3.select(this).node());
      div.node().appendChild(d3.select(this).node());
    });
    let rects = d3.select(".paletteDiv").selectAll(".rect");
    div = li.append("div").attr("class", "paletteBar");
    if (rects._groups[0].length > 0) {
      rects.each(function () {
        // li.node().appendChild(d3.select(this).node());
        div.node().appendChild(d3.select(this).node());
      });
    }
    li.append("div").attr("class", "delete_sign").append("i").attr("class", "icon_trash").style("color", "black").on("click", function () {
      li.remove();
      d3.event.stopPropagation()

    });
  }
}

function collectColorNames() {
  let color_names_checked = [];
  let inputs = d3.select("#color-names-div").selectAll("input");
  inputs.each(function () {
    // console.log(d3.select(this)._groups[0][0].value, d3.select(this)._groups[0][0].checked);
    if (d3.select(this)._groups[0][0].checked) {
      color_names_checked.push(d3.select(this)._groups[0][0].value);
    }
  });
  return color_names_checked;
}

function renderResult() {
  document.querySelector('#running').classList.remove('hide');

  setTimeout(() => {
    let palette;
    //scatterplot
    if (DATATYPE === "SCATTERPLOT") {
      palette = appendScatterplot();
    }

    //bar chart
    if (DATATYPE === "BARCHART") {
      palette = appendBarchart();
    }

    //line chart
    if (DATATYPE === "LINECHART") {
      palette = appendLinechart();
    }

    // draw the palette
    appendPaletteResult(palette);
    data_changed_sign = false;

    document.querySelector('#running').classList.add('hide')
  }, 0);
}

function appendScatterplot() {
  let used_palette = doColorization();
  // used_palette = ["#76b7b2", "#59a14f", "#ff9da7", "#edc948", "#e15759", "#b07aa1", "#bab0ac", "#4e79a7"]// tableau 20 optimized: -1.13
  used_palette = Tableau_10_palette
  // used_palette = shuffle(Tableau_10_palette.slice(0,used_palette.length));
  for (let i = 0; i < source_datasets.length; i++) {
    let scatterplot_svg = d3.select("#renderDiv").append("svg")
      .attr("width", SVGWIDTH).attr("height", SVGHEIGHT);
    let scatterplot = scatterplot_svg.style("background-color", bgcolor).append("g")
      .attr("transform", "translate(" + svg_margin.left + "," + svg_margin.top + ")");
    // draw dots
    let dots = scatterplot.append("g").selectAll(".dot")
      .data(source_datasets[i])
      .enter().append("circle")
      .attr("class", "dot")
      .attr("id", function (d) {
        return "class_" + labelToClass[cValue(d)];
      })
      .attr("r", radius)
      .attr("cx", xMap)
      .attr("cy", yMap)
      .attr("fill", function (d, i) {
        return used_palette[labelToClass[cValue(d)]];
      });
    // add the x Axis
    scatterplot.append("g")
      .attr("transform", "translate(0," + svg_height + ")")
      .call(d3.axisBottom(xScale).tickFormat(""));

    // add the y Axis
    scatterplot.append("g")
      .call(d3.axisLeft(yScale).tickFormat(""));


    let circle = scatterplot.append("circle")
      .attr("id", "choosed_cluster")
      .attr("r", 0)
      .style("stroke", bgcolor)
      .style("stroke-width", "1.5px");

    scatterplot_svg.on("mousemove", function () {
      let mouse_pos = [d3.mouse(this)[0] - svg_margin.left, d3.mouse(this)[1] - svg_margin.top];
      // check all points to find the desired
      let min_dis = 10000000000, desired_point = null;
      for (let d of source_datasets[i]) {
        let point_pos = [xMap(d), yMap(d)];
        let dis = (point_pos[0] - mouse_pos[0]) * (point_pos[0] - mouse_pos[0]) + (point_pos[1] - mouse_pos[1]) * (point_pos[1] - mouse_pos[1]);
        if (min_dis >= dis) {
          min_dis = dis;
          desired_point = d;
        }
      }
      if (min_dis > 100) {
        circle.attr("r", 0);
      } else {
        let id = cValue(desired_point);
        circle.attr("cx", mouse_pos[0])
          .attr("cy", mouse_pos[1])
          .attr("fill", used_palette[labelToClass[id]])
          .attr("r", 10)
          .attr("display", "block")
          .on("click", function () {
            for (let i = 0; i < choosed_emphasized_clusters.length; i++) {
              if (+choosed_emphasized_clusters[i].attr("clusterId") === labelToClass[id]) {
                return;
              }
            }
            let div = d3.select("#choosedDiv");
            let span = div.append("span").attr("class", "rect").attr("id", "choosedCluster-" + labelToClass[id]).attr("clusterId", labelToClass[id])
              .style("width", "30px").style("height", "30px").style("display", "inline-block")
              .style("margin-left", "10px").style("padding", "5px").style("background", used_palette[labelToClass[id]]).style("text-align", "center");
            // append lock and unlock sign
            let img = span.append("img").attr("class", "icon_delete").style("display", "none")
              .on("click", function () {
                let j = 0;
                for (j = 0; j < choosed_emphasized_clusters.length; j++) {
                  if (+choosed_emphasized_clusters[j].attr("clusterId") === labelToClass[id]) {
                    break;
                  }
                }
                choosed_emphasized_clusters.splice(j, 1);
                span.remove();
                if (choosed_emphasized_clusters.length === 0) {
                  d3.select("#specifyDiv").style("display", "none");
                }
              });
            span.on("mouseover", function () {
              d3.select(this).select("img").style("display", "block");
            })
              .on("mouseout", function () {
                d3.select(this).select("img").style("display", "none");
              })

            choosed_emphasized_clusters.push(span)
            d3.select("#specifyDiv").style("display", "inline-block");
          });
      }

    });

    scatterplot_svg.append("text").attr("x", 0).attr("y", 20).text(source_datasets_names[i]);

  }
  return used_palette;
}

function appendBarchart() {
  let used_palette = doColorization();
  for (let i = 0; i < source_datasets.length; i++) {
    let barchart_svg = d3.select("#renderDiv").append("svg")
      .attr("width", SVGWIDTH).attr("height", SVGHEIGHT);

    let barchart = barchart_svg.style("background-color", bgcolor)
      .append("g")
      .attr("transform", "translate(" + svg_margin.left + "," + svg_margin.top + ")");

    // add the x Axis
    barchart.append("g")
      .attr("transform", "translate(0," + svg_height + ")")
      .call(d3.axisBottom(xScale).tickFormat(""));

    // add the y Axis
    barchart.append("g")
      .call(d3.axisLeft(yScale).tickFormat(""));

    barchart.selectAll("bars")
      .data(source_datasets[i])
      .enter().append("rect")
      .attr("class", "bars")
      .attr("id", function (d) {
        return "bar_" + labelToClass[cValue(d)];
      })
      .style("fill", function (d) {
        return used_palette[labelToClass[cValue(d)]];
      })
      .attr("x", function (d) {
        return xScale(cValue(d));
      })
      .attr("width", xScale.bandwidth())
      .attr("y", function (d) {
        return yScale(yValue(d));
      })
      .attr("height", function (d) {
        return svg_height - yScale(yValue(d));
      })
      .attr("rx", 10).attr("ry", 10)
      .attr("item-color", function (d) {
        return used_palette[labelToClass[d.label]];
      })
      .on("click", appendClickEvent);
    barchart_svg.append("text").attr("x", 0).attr("y", 20).text(source_datasets_names[i]);
  }

  return used_palette;
}

function appendLinechart() {
  let used_palette = doColorization();
  for (let i = 0; i < source_datasets.length; i++) {
    let linechart_svg = d3.select("#renderDiv").append("svg")
      .attr("width", SVGWIDTH).attr("height", SVGHEIGHT);

    let linechart = linechart_svg.style("background-color", bgcolor)
      .append("g")
      .attr("transform", "translate(" + svg_margin.left + "," + svg_margin.top + ")");

    // Scale the range of the data
    xScale.domain(d3.extent(source_datasets[i], function (d) {
      return d.x;
    }));
    // define the line
    let valueline = d3.line()
      .x(function (d) {
        return xScale(d.x);
      })
      .y(function (d) {
        return yScale(d.y);
      }).curve(d3.curveCatmullRom);

    let linechart_source_data = [];
    for (let point of source_datasets[i]) {
      if (linechart_source_data[labelToClass[point.label]] == undefined) {
        linechart_source_data[labelToClass[point.label]] = { p: [], label: point.label };
      }
      linechart_source_data[labelToClass[point.label]].p.push({ x: point.x, y: point.y });
    }

    // Add the valueline path.
    linechart.selectAll('path')
      .data(linechart_source_data).enter().append("path")
      .attr("d", function (d) {
        return valueline(d.p);
      })
      .attr("class", "linechart")
      .attr("id", function (d) {
        return "line_" + labelToClass[d.label];
      })
      .attr("fill", "none")
      .attr("stroke", function (d) {
        return used_palette[labelToClass[d.label]];
      })
      .style("stroke-width", radius)
      .attr("item-color", function (d) {
        return used_palette[labelToClass[d.label]];
      })
      .on("click", appendClickEvent);

    // Add the X Axis
    linechart.append("g")
      .attr("transform", "translate(0," + svg_height + ")")
      .call(d3.axisBottom(xScale).tickFormat(""));

    // Add the Y Axis
    linechart.append("g")
      .call(d3.axisLeft(yScale).tickFormat(""));

    linechart_svg.append("text").attr("x", 0).attr("y", 20).text(source_datasets_names[i]);
  }
  return used_palette;
}

function appendClickEvent(d) {
  let color = d3.select(this).attr("item-color");
  for (let i = 0; i < choosed_emphasized_clusters.length; i++) {
    if (+choosed_emphasized_clusters[i].attr("clusterId") === labelToClass[d.label]) {
      return;
    }
  }
  let div = d3.select("#choosedDiv");
  let span = div.append("span").attr("class", "rect").attr("id", "choosedCluster-" + labelToClass[d.label]).attr("clusterId", labelToClass[d.label])
    .style("width", "30px").style("height", "30px").style("display", "inline-block")
    .style("margin-left", "10px").style("padding", "5px").style("background", color).style("text-align", "center");
  // append lock and unlock sign
  let img = span.append("img").attr("class", "icon_delete").style("display", "none")
    .on("click", function () {
      let j = 0;
      for (j = 0; j < choosed_emphasized_clusters.length; j++) {
        if (+choosed_emphasized_clusters[j].attr("clusterId") === labelToClass[d.label]) {
          break;
        }
      }
      choosed_emphasized_clusters.splice(j, 1);
      span.remove();
      if (choosed_emphasized_clusters.length === 0) {
        d3.select("#specifyDiv").style("display", "none");
      }
    });
  span.on("mouseover", function () {
    d3.select(this).select("img").style("display", "block");
  })
    .on("mouseout", function () {
      d3.select(this).select("img").style("display", "none");
    })

  choosed_emphasized_clusters.push(span)
  d3.select("#specifyDiv").style("display", "inline-block");
}

function appendPaletteResult(palette) {
  let palette_results_div = d3.select(".paletteDiv");
  for (let i = 0; i < palette.length; i++) {
    // assemble a color
    let color = d3.rgb(palette[i]);
    let c = getColorNameIndex(color);
    // write the color name
    let t = c3.color.relatedTerms(c, 1);
    let span = palette_results_div.append("span").attr("class", "rect")
      .style("width", "30px").style("height", "30px").style("display", "inline-block")
      .style("margin-left", "10px").style("background", palette[i]).attr("color", palette[i])
      .style("text-align", "center").style("padding", "5px")
      .attr("title", function () {
        if (t[0] === undefined) return "no name";
        return c3.terms[t[0].index];
      });
    // append lock and unlock sign
    let img = span.append("img").attr("class", "icon_unlock").style("display", "none").attr("isLocked", "0")
      .on("click", function () {
        if (d3.select(this).attr("class") === "icon_lock")
          d3.select(this).attr("class", "icon_unlock").attr("isLocked", "0").style("display", "none")
        else
          d3.select(this).attr("class", "icon_lock").attr("isLocked", "1").style("display", "block")
      });
    if (locked_pos.indexOf(i) != -1) {
      img.attr("class", "icon_lock").style("display", "block").attr("isLocked", "1")
    }
    span.on("mouseover", function () {
      d3.select(this).select("img").style("display", "block");
    })
      .on("mouseout", function () {
        if (d3.select(this).select("img").attr("class") === "icon_unlock")
          d3.select(this).select("img").style("display", "none")
      })
  }
  outputPalette(palette);
}

function outputPalette(palette) {
  //output the palette
  var format = resultsColorSpace,
    paletteStr = "[",
    data_palette_attr = "";
  for (let i = 0; i < palette.length - 1; i++) {
    paletteStr += "\"" + colorConversionFns[format](palette[i]) + "\",";
    data_palette_attr += palette[i] + ";";
  }
  paletteStr += "\"" + colorConversionFns[format](palette[palette.length - 1]) + "\"]";
  data_palette_attr += palette[palette.length - 1];
  d3.select("#paletteText").property('value', paletteStr).attr('data-palette', data_palette_attr);
}

$('.resultFnt').change(function () {
  resultsColorSpace = $(this).children("option:selected").text();
  var format = resultsColorSpace;
  var result = d3.select("#paletteText"),
    palette = result.attr('data-palette').split(';');

  palette = palette.map(function (c) {
    return d3.lab(c);
  });

  paletteStr = '[' + resultsQuote +
    palette.map(colorConversionFns[format])
      .join(resultsQuote + ', ' + resultsQuote) +
    resultsQuote + ']';
  result.property('value', paletteStr);
});

$('.paletteFnt').change(function () {
  let selection_text = $(this).children("option:selected").text();
  let paletteStr = "[";
  if (selection_text === "Tableau 10") {
    assignment_palette = Tableau_10_palette;
  } else if (selection_text === "Tableau 20") {
    assignment_palette = Tableau_20_palette;
  } else if (selection_text === "ColorBrewer 12-class Paired") {
    assignment_palette = ['#a6cee3', '#1f78b4', '#b2df8a', '#33a02c', '#fb9a99', '#e31a1c', '#fdbf6f', '#ff7f00', '#cab2d6', '#6a3d9a', '#ffff99', '#b15928']
  } else {
    assignment_palette = ['#8dd3c7', '#ffffb3', '#bebada', '#fb8072', '#80b1d3', '#fdb462', '#b3de69', '#fccde5', '#d9d9d9', '#bc80bd', '#ccebc5', '#ffed6f']
  }
  for (let i = 0; i < assignment_palette.length - 1; i++) {
    paletteStr += "\"" + assignment_palette[i] + "\",";
  }
  paletteStr += "\"" + assignment_palette[assignment_palette.length - 1] + "\"]";
  d3.select("#inputPaletteText").property('value', paletteStr);
});
$('.paletteFnt').change();

function changeBgcolor() {
  let bg_icon = d3.select("#bg_icon");
  if (bg_icon.attr("class") === "icon_black_bg") {
    bg_icon.attr("class", "icon_white_bg");
    bgcolor = "#000";
    renderResult();
  } else {
    bg_icon.attr("class", "icon_black_bg");
    bgcolor = "#fff";
    renderResult();
  }
}

function saMode(mode) {
  if (mode === 0) {
    d3.select("#effi_icon").attr("class", "icon_efficiency_choosed");
    d3.select("#qual_icon").attr("class", "icon_quality");
    decline_rate = decline_rate_efficiency;
  } else {
    d3.select("#effi_icon").attr("class", "icon_efficiency");
    d3.select("#qual_icon").attr("class", "icon_quality_choosed");
    decline_rate = decline_rate_quality;
  }
}

function drawTransferFunction(palette) {
  d3.select("#tfDiv").selectAll("svg").remove();
  let tf_svg = d3.select("#tfDiv").append("svg")
    .attr("width", SVGWIDTH).attr("height", SVGHEIGHT);

  let tf = tf_svg.style("background-color", bgcolor)
    .append("g")
    .attr("transform", "translate(" + (svg_margin.left + 20) + "," + svg_margin.top + ")");

  let m_xScale = d3.scaleLinear().range([0, svg_width]);
  let m_yScale = d3.scaleLinear().range([svg_height, 0])
  // Scale the range of the data
  m_xScale.domain([0, 1.2]);
  m_yScale.domain([-1.2, Math.exp(1.2)]);


  // Add the X Axis
  tf.append("g")
    .attr("transform", "translate(0," + svg_height * Math.exp(1.2) / (Math.exp(1.2) + 1.2) + ")")
    .call(d3.axisBottom(m_xScale));

  // Add the Y Axis
  tf.append("g")
    .call(d3.axisLeft(m_yScale));


  let drawLine = function (a, b, c, d, dash = false) {
    let line = tf.append("line")
      .attr("x1", m_xScale(a))
      .attr("y1", m_yScale(b))
      .attr("x2", m_xScale(c))
      .attr("y2", m_yScale(d))
      .style("stroke", "#000");
    if (dash) {
      line.style("stroke-dasharray", ("3, 3"));
    }
  }
  if (choosed_emphasized_clusters.length > 0) {
    let control_points_data = [{ x: 0, y: -1 }, { x: kappa[0], y: -1 }, { x: kappa[0], y: Math.exp(kappa[0]) }, { x: kappa[1], y: Math.exp(kappa[1]) }, { x: kappa[1], y: -1 }, { x: 1, y: -1 }];
    for (let i = 0; i < delta_change_distance.length; i++) {
      if (delta_change_distance[i] > 0) {
        control_points_data.push({ x: 0, y: -1 });
      }
    }
    let tmp = {}
    for (let i = 0; i < palette.length; i++) {
      if (!tmp[change_distance[i]]) tmp[change_distance[i]] = 0
      let rect = tf.append("rect")
        .attr("x", m_xScale(change_distance[i]) - 10)
        .attr("y", function () {
          return svg_height * Math.exp(1.2) / (Math.exp(1.2) + 1.2) - 10 - 25 * tmp[change_distance[i]];
        })
        .attr("width", 20)
        .attr("height", 20)
        .attr("fill", palette[i]);
      tmp[change_distance[i]] += 1;
      let circle = tf.append("circle")
        .attr("r", 10)
        .attr("cx", m_xScale(change_distance[i]))
        .attr("fill", "#000")
        .style("stroke", "#000");
      if (delta_change_distance[i] > 0) {
        circle.attr("cy", m_yScale(1))
        drawLine(change_distance[i], 0, change_distance[i], 1, true)
      } else {
        circle.attr("cy", m_yScale(-1))
        drawLine(change_distance[i], 0, change_distance[i], -1, true)
      }
    }
  } else {
    // draw class rects
    let tmp = {}
    for (let i = 0; i < palette.length; i++) {
      if (!tmp[change_distance[i]]) tmp[change_distance[i]] = 0
      tf.append("rect")
        .attr("x", m_xScale(change_distance[i]) - 10)
        .attr("y", function () {
          return svg_height * Math.exp(1.2) / (Math.exp(1.2) + 1.2) - 10 - 25 * tmp[change_distance[i]];
        })
        .attr("width", 20)
        .attr("height", 20)
        .attr("fill", palette[i]);
      tmp[change_distance[i]] += 1;
    }
    // interpolate points
    let control_points_data = [{ x: 0, y: -1 }, { x: kappa[0], y: -1 }, { x: kappa[0], y: Math.exp(kappa[0]) }, { x: kappa[1], y: Math.exp(kappa[1]) }, { x: kappa[1], y: -1 }, { x: 1, y: -1 }];
    let exp_data = [], step = (kappa[1] - kappa[0]) / 100;
    for (let i = kappa[0]; i <= kappa[1]; i += step) {
      exp_data.push({ x: i, y: Math.exp(i) });
    }


    // draw lines
    if (control_points_data[1].x > 0)
      drawLine(control_points_data[0].x, control_points_data[0].y, control_points_data[1].x, control_points_data[1].y)
    for (let i = 0; i < exp_data.length - 1; i++) {
      drawLine(exp_data[i].x, exp_data[i].y, exp_data[i + 1].x, exp_data[i + 1].y)
    }
    if (control_points_data[4].x < 1)
      drawLine(control_points_data[4].x, control_points_data[4].y, control_points_data[5].x, control_points_data[5].y)

    let drag = d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
    function dragstarted() {
      //d3.event.sourceEvent.stopPropagation();
      d3.select(this).attr("stroke", "red").attr("stroke-width", 3);
      d3.select(this).attr("cx", d3.event.x);
    }

    function dragged() {
      d3.select(this).attr("cx", d3.event.x);
    }

    function dragended() {
      d3.select(this).attr("stroke", "#000").attr("stroke-width", 0);
      d3.select(this).attr("cx", d3.event.x);
      let circle_index = this.id.split("_")[1];
      if (circle_index == 1)
        kappa[0] = m_xScale.invert(d3.event.x)
      if (circle_index == 3)
        kappa[1] = m_xScale.invert(d3.event.x)

      drawTransferFunction(palette);
    }
    // draw control points
    for (let i = 1; i < control_points_data.length - 1; i++) {
      let circle = tf.append("circle")
        .attr("id", function () {
          return "circle_" + i;
        })
        .attr("r", 10)
        .attr("cx", function () {
          return m_xScale(control_points_data[i].x);
        })
        .attr("cy", function () {
          return m_yScale(control_points_data[i].y);
        })
        .style("stroke", "#000");
      if (i % 2 === 1) {
        circle.attr("fill", "#000")
        //.style("stroke", "red").attr("stroke-width", 2);
      } else {
        circle.attr("fill", "none")
        // circle.attr("fill", "#000").style("opacity", 0.5)
      }
      if (i == 1 || i == 3)
        circle.call(drag);
    }
    // draw control points to axis: dotted line
    for (let i = 1; i < control_points_data.length - 1; i++) {
      drawLine(control_points_data[i].x, control_points_data[i].y, control_points_data[i].x, 0, true);
    }
  }


}

function changeAlpha(alpha) {
  if (choosed_emphasized_clusters.length > 0) {
    let choosed_cluster_id_array = []
    for (let i = 0; i < choosed_emphasized_clusters.length; i++) {
      let id = +choosed_emphasized_clusters[i].attr("clusterId");
      choosed_cluster_id_array.push(id);
    }
    for (let i = 0; i < Object.keys(labelToClass).length; i++) {
      if (choosed_cluster_id_array.indexOf(i) == -1) {
        d3.select("#renderDiv").selectAll("#class_" + i).style("opacity", alpha);
      } else {
        d3.select("#renderDiv").selectAll("#class_" + i).style("opacity", 1);
      }
    }
  }
}