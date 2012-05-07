var lastfmApiKey = 'b310eee6bf595b01e4e07a9d78ff9609';
var user = '';

var ranges = [];

var rangeDataFetched = 0;
var rangeData = {};
var discoverDate = {};
var discoverPlays = {};

function renderChart(discoverPlays) {
    data = []
    $.each(ranges, function(i, chartRange) {
        range = chartRange['to'];
        amount = discoverPlays[range]

        if (amount == undefined) {
            amount = 0;
        }

        data.push([range*1000, amount]);
    });
   
    console.log('Rendering chart');
    showGraph();

    window.chart = new Highcharts.StockChart({
        chart: {
            renderTo: 'container',
            type: 'spline',
        },

        rangeSelector: {
            selected: 4
        },

        scrollbar: {
            barBackgroundColor: 'gray',
            barBorderRadius: 7,
            barBorderWidth: 0,
            buttonBackgroundColor: 'gray',
            buttonBorderWidth: 0,
            buttonBorderRadius: 7,
            trackBackgroundColor: 'none',
            trackBorderWidth: 1,
            trackBorderRadius: 8,
            trackBorderColor: '#CCC'
        },

        yAxis: {
            title: {
                text: 'Plays of newly discovered artists',
                style: {
                    color: 'black'
                }
            },
            min: 0
        },

        tooltip: {
            formatter: function() {
                if (!discoverDate.hasOwnProperty("" + this.x/1000)) {
                    return false;
                }

                var s = '<b>Discoveries in the week ending '+ Highcharts.dateFormat('%A, %b %e, %Y', this.x) +'</b><br/>';
                $.each(discoverDate["" + this.x/1000], function(range, artist) {
                    s += '* ' + artist + '<br/>';
                });

                return s;
            }
        },

        series: [{
            data: data,
        }]
    });
}

function processDiscoveries(rangeData) {
    discoveredArtists = [];

    $.each(rangeData, function(range, artists) {
        discovered = []
        
        oldplays = 0;
        newplays = 0;

        if (artists) { 
            $.each(artists, function(i, artist) {
                if (discoveredArtists.indexOf(artist.name) == -1 && artist.playcount > 1) {
                    discoveredArtists.push(artist.name);
                    discovered.push(artist.name);

                    newplays += parseInt(artist.playcount);
                }
            });

            if (discovered.length > 0) {
                discoverDate[range] = discovered;
            }
        }
        
        discoverPlays[range] = newplays;

        if (range == ranges.slice(-1)[0].to) {
            console.log('Finished processing discoveries')
            renderChart(discoverPlays);
        }

    });
}

function updateFetchedCount(ranges, rangeData) {
    remaining = (100 / ranges.length) * rangeDataFetched;

    console.log(remaining + '% fetched')
    
    $('#status').text('Charts ' + remaining.toFixed(2) + '% complete...');
    
    if (remaining == 100) {
        console.log('Fetching complete!');
        processDiscoveries(rangeData);
    }
}

function fetchRange (chartRange) {
    $.ajax({
        url: 'http://ws.audioscrobbler.com/2.0/?method=user.getweeklyartistchart&user=' + 
             user + '&api_key=' + lastfmApiKey + '&format=json&from=' + chartRange['from'] + 
             '&to=' + chartRange['to'] + '&length=1000&callback=?',
        
        dataType: 'json',
        timeout : 10000,
        
        success: function (data) {
            if (data.weeklyartistchart == undefined) {
                chart = [];
            } else { 
                chart = data.weeklyartistchart.artist;
            }

            rangeData[chartRange['to']] = chart
            rangeDataFetched++;
            updateFetchedCount(ranges, rangeData);
        },
        
        error: function(data, textStatus, jqXHR) {
            console.log('Error fetching chart, retrying in 5s...');
            
            setTimeout(function() {
                console.log('Retrying chart fetch...');
                fetchRange(chartRange);
            }, 5*1000)
        }
    });
}

function fetchRanges (ranges) {
    showStatus();
    
    $.each(ranges, function(i, chartRange) {
        fetchRange(chartRange);
    });
}

function getChartRanges () {
    $('#status').text('Fetching charts...');
    
    $.ajax({
        url: 'http://ws.audioscrobbler.com/2.0/?method=user.getweeklychartlist&user=' + 
             user + '&api_key=' + lastfmApiKey + '&format=json&callback=?',
        
        dataType: 'json',
        timeout : 10000,
        
        success: function (data) {
            if (data.weeklychartlist == undefined) {
                $('#status').text(user + ' is not a last.fm user :\'(');
                return;
            }

            ranges = data.weeklychartlist.chart;
            fetchRanges(ranges);
        },

        error: function(data, textStatus, jqXHR) {
            console.log('Error fetching chart ranges, retrying in 5s...');
            
            setTimeout(function() {
                console.log('Retrying chart ranges fetch...');
                getChartRanges();
            }, 5*1000)
        }
    });
}

function start() {
    user = $('#username').val();
    
    if (!user) {
        return;
    }

    $('#usertext').text(user);
    $('#userheading').text(user + "'s ");
    $('#dots').hide();

    window.location.hash = user;

    ranges = [];
    rangeDataFetched = 0;
    rangeData = {};
    discoverDate = {};
    discoverPlays = {};
    
    hideUserInput();
    getChartRanges();

    return false;
}

function showGraph() {
    hideStatus();
    $('#container').show();
}

function showStatus() {
    $('#status').show();
}

function hideStatus() {
    $('#status').hide();
}

function showUserInput () {
    hideStatus();
    $('#switchUser').hide();
    $('#container').hide();
    $('#userInput').show();

    $('#userheading').hide();
    $('#dots').show();
    $('#note').show();
}

function hideUserInput () {
    $('#switchUser').show();
    $('#userInput').hide();
    $('#userheading').show();
    $('#note').hide();
}

function load () {
    hash = window.location.hash;
    new_user = hash.substring(1);

    if (user != new_user) {
        $('#username').val(new_user);
        start();
    }

    window.onhashchange = function () {
        load();
    }
}
