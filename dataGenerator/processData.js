/**
 * convert scatterplot matrix data to multiple scatterplots used different variables
 * factors = ["Days On Market", "Delinquency", "Year over Year", "Market Health Index"]
 */
function process() {
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
process()