/*
 * Constants
 */
var JUDGES = {
    ALL: ["ESN", "JJA", "LMC", "YFC", "APB", "MS", "ST", "CB"],
    ROUND1: ["ESN", "JJA", "LMC", "YFC", "APB", "MS"],
    ROUND2: ["ESN", "JJA", "LMC", "YFC", "APB", "MS"],
    SEMI: ["ESN", "LMC", "YFC", "APB"],
    FINAL: ["ESN", "JJA", "LMC", "YFC", "APB", "MS", "ST"],
};
var PASS = {
    ROUND1: 12,
    ROUND2: 6,
    SEMI: 3,
    FINAL: 1
};


/*
 * Sorts
 */
var SortFactory = function(keys, isAscending) {
    // Base case for ties, no more keys
    if (keys.length === 0) {
        return function(){ return 0; };
    }

    var x = -1;
    if (isAscending) { x = 1;}

    var key = keys[0];
    var y = SortFactory;
    return function(a, b) {
        if (a[key] < b[key]) { return x*-1; }
        if (a[key] > b[key]) { return x*1; }

        // If tie, recurse to next key
        return SortFactory(keys.slice(1), isAscending)(a, b);
    };
};

var SORTS = {
    DEFAULT: SortFactory(["Votes", "Sum", "ESN"]),
    CANDIDATE_ORDER: SortFactory(["candidate"], true),
    SCORES: SortFactory(["Sum"]),
    ESN: SortFactory(["ESN", "Sum"])
};


/*
 * Mithril Templates
 */
var Template = {};
Template.genRows = function(data, roundName) {
    var judges = JUDGES[roundName];
    var passThreshold = PASS[roundName];

    // Set "pass" attributes
    var dataCopy = data.slice();
    dataCopy.sort(SORTS.DEFAULT);
    for (var i = 0; i < dataCopy.length; i++) {
        dataCopy[i].pass = (i < passThreshold);
    }

    // Sort data
    data.sort(Main.sortFunction());

    var results = [];
    for (var j = 0; j < data.length; j++) {
        var candidate = data[j];

        // Populate row
        var row = [];
        var passStyle = {class: candidate.pass? "pass":"nopass"};
        row.push(m("td", passStyle, candidate.candidate));

        for (var k = 0; k < judges.length; k++) {
            var key = judges[k];
            row.push(m("td", {class: candidate.juryVotes[key] === 1? "litepass":"litenopass"}, candidate[key]));
        }

        row.push(m("td", passStyle, candidate.Votes));
        row.push(m("td", passStyle, candidate.Sum));

        results.push(m("tr", row));
    }
    return results;
};

Template.genTable = function(scores, votes, roundName) {
    var judges = JUDGES[roundName];

    // Add "Votes" field to scores
    // Add "jury" field to scores for individual juror votes
    for (var i = 0; i < votes.length; i++) {
        var candidate = scores[i];
        candidate.Votes = votes[i].Sum;

        // Iterate judges, find which judges are in candidate,
        // then add to jury field the jury votes (1 or 0)
        var juryVotes = {};
        for (var j = 0; j < judges.length; j++) {
            var judgeName = judges[j];
            if (judgeName in candidate) {
                juryVotes[judgeName] = votes[i][judgeName];
            }
        }

        candidate.juryVotes = juryVotes;
    }

    return m("table",
        m("tbody",
            m("tr", [
                    m("th", "Candidate"),

                    judges.map(function(judge) {
                        return m("th", judge);
                    }),

                    m("th", "Votes"),
                    m("th", "Sum"),
            ]),
            Template.genRows(scores, roundName)
        )
    );
};


/*
 * Call this function to generate the table
 */
Template.gen = function(scoresKey, votesKey, roundName) {
    var data = Data.getData();

    // Deep copy
    var scores = JSON.parse(JSON.stringify(data[scoresKey]));
    var votes = JSON.parse(JSON.stringify(data[votesKey]));

    return Template.genTable(scores, votes, roundName);
};


/*
 * Data
 */
var Data = {};
Data.getData = m.request({method:"GET", url:"grieg.json"}).then(function(data) {
    // Create sums for each candidate

    // Iterate categories
    for (var key in data) {
        var category = data[key];

        // Iterate candidates
        for (var j = 0; j < category.length; j++) {
            var candidate = category[j];

            Data.sumScores(candidate);
        }
    }
    return data;
});


// Destructive function to add scores and set "sum" field to an object
Data.sumScores = function(candidate) {
    var sum = 0;
    // Iterate judges
    for (var i = 0; i < JUDGES.ALL.length; i++) {
        var key = JUDGES.ALL[i];
        if (key in candidate) {
            sum += candidate[key];
        }
    }

    candidate.Sum = sum; // candidate.Sum is capitalized
};


/*
 * Main
 */
var Main = {
    1: {
        view: function() { return Main.viewTemplate(1, "ROUND1", "Round 1"); }
    },
    2: {
        view: function() { return Main.viewTemplate(2, "ROUND2", "Round 2"); }
    },
    3: {
        view: function() { return Main.viewTemplate(3, "SEMI", "Semi-finals"); }
    },
    4: {
        view: function() { return Main.viewTemplate(4, "FINAL", "Finals"); }
    },
};

Main.sortFunction = m.prop(SORTS.DEFAULT);

Main.viewTemplate = function(roundNumber, roundName, prettyRoundName) {
    var scoresKey = "scores" + roundNumber;
    var votesKey = "votes" + roundNumber;

    // Buttons to change mode (round)
    var genModeButton = function(url, name) {
        return m("a.block.button", {
            config: m.route,
            href: url,
            class: m.route() === url? "active":""
        }, name);
    };

    // Buttons to change sort order
    var genSortbyButton = function(sort, name) {
        return m("a.block.button", {
            href: "#",
            onclick: function() { Main.sortFunction(sort); },
            class: sort === Main.sortFunction()? "active":""
        }, name);
    };

    return [
        m("h1", "Grieg Competition 2016 Votes"),
        m("div.block-group.modes", [
            genModeButton("/", "Round 1"),
            genModeButton("/2", "Round 2"),
            genModeButton("/3", "Semi-finals"),
            genModeButton("/4", "Finals"),
        ]),


        m("div.block-group.sortby", [
            genSortbyButton(SORTS.DEFAULT, "Sort by Total Votes"),
            genSortbyButton(SORTS.SCORES, "Sort by Total Score"),
            genSortbyButton(SORTS.CANDIDATE_ORDER, "Sort by Candidate Order"),
        ]),
        m("div", Template.gen(scoresKey, votesKey, roundName)),

        // Disclaimer
        m("div#disclaimer", [
            m("p", "Disclaimer: this is not affiliated with the Grieg Piano Competition in any way."),
            m("p", "All data was publicly retrieved from ", m('a[href="http://griegcompetition.com/votes"]', "the official website"), "."),
        ])
    ];
};

m.route(document.body, "/", {
    "/": Main[1],
    "/2": Main[2],
    "/3": Main[3],
    "/4": Main[4],
});

