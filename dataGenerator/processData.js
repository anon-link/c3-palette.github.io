/**
 * convert scatterplot matrix data to multiple scatterplots used different variables
 * factors = ["Days On Market", "Delinquency", "Year over Year", "Market Health Index"]
 */
function processSM() {
    // load data
    d3.csv("../data/Scatterplot_Matrix_data.csv", function (data) {
        console.log(data);
        let output = {}
        for (let d of data) {
            if (d["Days On Market"] != "" && d["Delinquency"] != "") {
                if (!output["Days On Market-Delinquency"]) output["Days On Market-Delinquency"] = []
                if (!output["Delinquency-Days On Market"]) output["Delinquency-Days On Market"] = []
                output["Days On Market-Delinquency"].push(d)
                output["Delinquency-Days On Market"].push(d)
            }
            if (d["Days On Market"] != "" && d["Year over Year"] != "") {
                if (!output["Days On Market-Year over Year"]) output["Days On Market-Year over Year"] = []
                if (!output["Year over Year-Days On Market"]) output["Year over Year-Days On Market"] = []
                output["Days On Market-Year over Year"].push(d)
                output["Year over Year-Days On Market"].push(d)
            }
            if (d["Days On Market"] != "" && d["Market Health Index"] != "") {
                if (!output["Days On Market-Market Health Index"]) output["Days On Market-Market Health Index"] = []
                if (!output["Market Health Index-Days On Market"]) output["Market Health Index-Days On Market"] = []
                output["Days On Market-Market Health Index"].push(d)
                output["Market Health Index-Days On Market"].push(d)
            }
            if (d["Delinquency"] != "" && d["Year over Year"] != "") {
                if (!output["Delinquency-Year over Year"]) output["Delinquency-Year over Year"] = []
                if (!output["Year over Year-Delinquency"]) output["Year over Year-Delinquency"] = []
                output["Delinquency-Year over Year"].push(d)
                output["Year over Year-Delinquency"].push(d)
            }
            if (d["Delinquency"] != "" && d["Market Health Index"] != "") {
                if (!output["Delinquency-Market Health Index"]) output["Delinquency-Market Health Index"] = []
                if (!output["Market Health Index-Delinquency"]) output["Market Health Index-Delinquency"] = []
                output["Delinquency-Market Health Index"].push(d)
                output["Market Health Index-Delinquency"].push(d)
            }
            if (d["Year over Year"] != "" && d["Market Health Index"] != "") {
                if (!output["Year over Year-Market Health Index"]) output["Year over Year-Market Health Index"] = []
                if (!output["Market Health Index-Year over Year"]) output["Market Health Index-Year over Year"] = []
                output["Year over Year-Market Health Index"].push(d)
                output["Market Health Index-Year over Year"].push(d)
            }
        }
        console.log(output);
        // output to csv
        let id_count = 0
        let factors = Object.keys(output)
        let interval = setInterval(function () {
            if (id_count === factors.length) clearInterval(interval);
            let key = factors[id_count]
            let factor_id = key.split("-")
            let str = "";
            for (let d of output[key]) {
                str += d[factor_id[0]];
                str += ",";
                str += d[factor_id[1]];
                str += ",";
                str += d["State"];
                str += "\n";
            }
            downloadFile(key + ".csv", str);
            id_count++
        }, 1000)
    })
}
// processSM()

function processAbsent() {
    // load data
    d3.csv("../dataGenerator/time-series/Absenteeism_at_work_AAA/Absenteeism_at_work.csv", function (data) {
        console.log(data);
        let factors = ["Month of absence", "Day of the week", 'Seasons']
        let output = {}, stat = {}
        for (let d of data) {
            for (let i of factors) {
                if (!output[i]) output[i] = {}
                if (!output[i][i + "-" + d[i]]) output[i][i + "-" + d[i]] = []
                output[i][i + "-" + d[i]].push(d)
            }
            if(!stat[d["Reason for absence"]]) stat[d["Reason for absence"]] = []
            stat[d["Reason for absence"]].push(d)
        }
        let tmp = []
        for (let i in stat){
            tmp.push([i, stat[i].length])
        }
        tmp.sort((a,b)=>(b[1]-a[1]))
        console.log(output, tmp);
        tmp = tmp.slice(0,10)
        let choosed_reasons = []
        for(let d of tmp){
            choosed_reasons.push(d[0])
        }
        // output to csv
        let factor_count = 0, file_count = 0
        let interval = setInterval(function () {
            if (factor_count === factors.length) clearInterval(interval);
            let key = factors[factor_count]
            let keys = Object.keys(output[key])
            let str = "";
            for (let d of output[key][keys[file_count]]) {
                if(choosed_reasons.indexOf(d["Reason for absence"])===-1) continue
                str += d['Distance from Residence to Work'];
                str += ",";
                str += d["Transportation expense"];
                str += ",";
                str += d["Reason for absence"];
                str += "\n";
            }
            downloadFile(keys[file_count] + ".csv", str);
            file_count++
            if (file_count === keys.length) {
                file_count = 0
                factor_count++
            }
        }, 1000)
    })
}
processAbsent()