/*
Copyright (c) 2006, NAKAMURA Satoru
All rights reserved.

Redistribution and use in source and binary forms, with or without 
modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright notice,
      this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright notice,
      this list of conditions and the following disclaimer in the documentation
      and/or other materials provided with the distribution.
    * Neither the name of the NAKAMURA Satoru nor the names of its contributors
      may be used to endorse or promote products derived from this
      software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED 
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES 
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON 
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT 
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS 
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
/**
 * DateFormatter
 * 
 * @website http://clonedoppelganger.net/
 * @version 0.0.1
 * 
 * Example:
 *  var now = new Date();
 *  alert(DateFormatter.format(now, "Y/m/d H:i:s"));
 */
var DateFormatter = {

    /**
    * format
    * @param  {Date} target date object
    *         {String} pattern
    *  Y : A full numeric representation of a year, 4 digits
    *  y : A two digit representation of a year
    *  m : Numeric representation of a month, with leading zeros
    *  n : Numeric representation of a month, without leading zeros
    *  F : A full textual representation of a month, such as January or March
    *  M : A short textual representation of a month, three letters
    *  O : Japanese old month name
    *  d : Day of the month, 2 digits with leading zeros
    *  j : Day of the month without leading zeros
    *  w : Numeric representation of the day of the week
    *  l : A full textual representation of the day of the week
    *  D : A textual representation of a day, three letters
    *  N : ISO-8601 numeric representation of the day of the week
    *  J : A Japanese textual representation of the day of the week
    *  g : 12-hour format of an hour without leading zeros
    *  G : 24-hour format of an hour without leading zeros
    *  h : 12-hour format of an hour with leading zeros
    *  H : 24-hour format of an hour with leading zeros
    *  i : Minutes with leading zeros
    *  s : Seconds, with leading zeros
    *  a : Lowercase Ante meridiem and Post meridiem (am or pm)
    *  A : Uppercase Ante meridiem and Post meridiem （AM or PM）
    *  S : English ordinal suffix for the day of the month, 2 characters
    *  z : The day of the year (starting from 0)
    *  t : Number of days in the given month
    *  L : Whether it's a leap year
    *  Escape character is #. Example: DateFormatter.format(new Date(), "#Y#m#d #i#s Ymd");
    * @return {String} formatted date
    */
    format: function (d, pattern) {
        if (typeof pattern != "string") return;
        var dYear = d.getFullYear();
        var dMonth = d.getMonth();
        var dDate = d.getDate();
        var dDay = d.getDay();
        var dHours = d.getHours();
        var dMinutes = d.getMinutes();
        var dSeconds = d.getSeconds();
        var res = "";
        for (var i = 0, len = pattern.length; i < len; i++) {
            var c = pattern.charAt(i);
            switch (c) {
                case "#":
                    if (i == len - 1) break;
                    res += pattern.charAt(++i);
                    break;
                case "Y": res += dYear; break;
                case "y": res += dYear.toString().substr(2, 2); break;
                case "m": res += this.preZero(dMonth + 1); break;
                case "n": res += dMonth + 1; break;
                case "d": res += this.preZero(dDate); break;
                case "j": res += dDate; break;
                case "w": res += dDay; break;
                case "N": res += this.isoDay(dDay); break
                case "l": res += this.weekFullEn[dDay]; break;
                case "D": res += this.weekFullEn[dDay].substr(0, 3); break;
                case "J": res += this.weekJp[dDay]; break;
                case "F": res += this.monthFullEn[dMonth]; break;
                case "M": res += this.monthFullEn[dMonth].substr(0, 3); break;
                case "O": res += this.monthOldJp[dMonth]; break;
                case "a": res += this.ampm(dHours); break;
                case "A": res += this.ampm(dHours).toUpperCase(); break;
                case "H": res += this.preZero(dHours); break;
                case "h": res += this.preZero(this.from24to12(dHours)); break;
                case "g": res += this.from24to12(dHours); break;
                case "G": res += dHours; break;
                case "i": res += this.preZero(dMinutes); break;
                case "s": res += this.preZero(dSeconds); break;
                case "t": res += this.lastDayOfMonth(d); break;
                case "L": res += this.isLeapYear(dYear); break;
                case "z": res += this.dateCount(dYear, dMonth, dDate); break;
                case "S": res += this.dateSuffix[dDate - 1]; break;
                default: res += c; break;
            }
        }
        return res;
    },

    weekFullEn: ["Sunday", "Monday", "Tuesday",
    "Wednesday", "Thursday", "Friday", "Saturday"],

    weekJp: ["日", "月", "火", "水", "木", "金", "土"],

    monthFullEn: ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"],

    monthOldJp: ["睦月", "如月", "弥生", "卯月", "皐月", "水無月",
    "文月", "葉月", "長月", "神無月", "霜月", "師走"],

    dateSuffix: [
    "st", "nd", "rd", "th", "th", "th", "th", "th", "th", "th",
    "th", "th", "th", "th", "th", "th", "th", "th", "th", "th",
    "st", "nd", "rd", "th", "th", "th", "th", "th", "th", "th", "st"],

    preZero: function (value) {
        return (parseInt(value) < 10) ? "0" + value : value;
    },

    from24to12: function (hours) {
        return (hours > 12) ? hours - 12 : hours;
    },

    ampm: function (hours) {
        return (hours < 12) ? "am" : "pm";
    },

    isoDay: function (day) {
        return (day == 0) ? "7" : day;
    },

    lastDayOfMonth: function (dateObj) {
        var tmp = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 1);
        tmp.setTime(tmp.getTime() - 1);
        return tmp.getDate();
    },

    isLeapYear: function (year) {
        var tmp = new Date(year, 0, 1);
        var sum = 0;
        for (var i = 0; i < 12; i++) {
            tmp.setMonth(i);
            sum += this.lastDayOfMonth(tmp);
        }
        return (sum == 365) ? "0" : "1";
    },

    dateCount: function (year, month, date) {
        var tmp = new Date(year, 0, 1);
        var sum = -1;
        for (var i = 0; i < month; i++) {
            tmp.setMonth(i);
            sum += this.lastDayOfMonth(tmp);
        }
        return sum + date;
    }

}
