/***
 * Contains basic SlickGrid formatters.
 * @module Formatters
 * @namespace Slick
 */
(function ($) {
    // register namespace
    $.extend(true, window, {
        "Slick": {
            "Formatters": {
                "PercentComplete": PercentCompleteFormatter,
                "PercentCompleteBar": PercentCompleteBarFormatter,
                "YesNo": YesNoFormatter,
                "Checkmark": CheckmarkFormatter,
                "Date": DtFormatter,
                "Position": PositionFormatter
            }
        }
    });

    function PercentCompleteFormatter(row, cell, value, columnDef, dataContext) {
        if (value == null || value === "") {
            return "-";
        } else if (value < 50) {
            return "<span style='color:red;font-weight:bold;'>" + value + "%</span>";
        } else {
            return "<span style='color:green'>" + value + "%</span>";
        }
    }

    function PercentCompleteBarFormatter(row, cell, value, columnDef, dataContext) {
        if (value == null || value === "") {
            return "";
        }

        var color;

        if (value < 30) {
            color = "red";
        } else if (value < 70) {
            color = "silver";
        } else {
            color = "green";
        }

        return "<span class='percent-complete-bar' style='background:" + color + ";width:" + value + "%'></span>";
    }

    function YesNoFormatter(row, cell, value, columnDef, dataContext) {
        return value ? "Yes" : "No";
    }

    function CheckmarkFormatter(row, cell, value, columnDef, dataContext) {
        return value ? "<img src='../images/tick.png'>" : "";
    }

    function DtFormatter(row, cell, value, columnDef, dataContext) {
        if (value == null || value === "") {
            return "";
        }
        var dt;
        if (typeof value == "string") {
            dt = new Date(value);
        } else {
            dt = new Date(+value);
        }
        return DateFormatter.format(dt, "y/m/d");
    }

    function PositionFormatter(row, cell, value, columnDef, dataContext) {
        if (value == null || value === "") {
            return "";
        }
        return DateFormatter.format(new Date(+value), "i:s");
    }
})(jQuery);