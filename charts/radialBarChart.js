(function() {
  // A multiple bar chart

  // The Model
  // The model abstraction is a matrix of categories: the main dimension will define the groups,
  // and the secondary will define the single bars.
  // Optional dimension is on the bar chart color (to be defined).

  var model = raw.model();

  // Categories dimension. each category will define a bar
  // It can accept both numbers and strings
  var categories = model
    .dimension()
    .title("X Axis")
    .types(Number, String)
    .required(true);
  // Values dimension. It will define the height of the bars
  var sizes = model
    .dimension()
    .title("Height")
    .types(Number);

  // Group dimension.
  // It can accept both numbers and strings
  var groups = model
    .dimension()
    .title("Groups")
    .types(Number, String);

  // Colors dimension. It will define the color of the bars
  var colorsDimesion = model
    .dimension()
    .title("Colors")
    .types(String);

  // Mapping function
  // For each record in the data returns the values
  // for the X and Y dimensions and casts them as numbers
  model.map(function(data) {
    var results = d3
      .nest()
      .key(function(d) {
        return d[groups()];
      })
      .key(function(d) {
        return d[categories()];
      })
      .rollup(function(v) {
        return {
          size: !sizes()
            ? v.length
            : d3.sum(v, function(e) {
                return e[sizes()];
              }),
          category: categories(v[0]),
          group: groups(v[0]),
          color: colorsDimesion(v[0])
        };
      })
      .entries(data);

    // remap the array
    results.forEach(function(d) {
      d.values = d.values.map(function(item) {
        return item.value;
      });
    });

    return results;
  });

  // The Chart

  var chart = raw
    .chart()
    .title("Radial Bar chart")
    .description(
      "A bar chart or bar graph is a chart or graph that presents grouped data with rectangular bars with heights proportional to the values that they represent.</br> Chart based on <a href='https://bl.ocks.org/mbostock/3310560'>https://bl.ocks.org/mbostock/3310560</a>"
    )
    .thumbnail("imgs/barChart.png")
    .category("Other")
    .model(model);

  // visualiziation options
  var debug = chart
    .checkbox()
    .title("Debug mode")
    .defaultValue(false);
  // Width
  var width = chart
    .number()
    .title("Width")
    .defaultValue(800);

  // Height
  var height = chart
    .number()
    .title("Height")
    .defaultValue(600);

  //left margin
  var globalMargin = chart
    .number()
    .title("Global Margin")
    .defaultValue(120);

  // Padding between bars
  var xPadding = chart
    .number()
    .title("Horizontal padding")
    .defaultValue(2);

  var barWidth = chart
    .number()
    .title("Bar width")
    .defaultValue(8);

  var innerCircle = chart
    .number()
    .title("Inner circle dimension")
    .defaultValue(36);

  // Use or not the same scale across all the bar charts
  var sameScale = chart
    .checkbox()
    .title("Shared scale across charts")
    .defaultValue(false);

  var labelsFormat = chart
    .checkbox()
    .title("Clock-style labels")
    .defaultValue(false);

  // Chart colors
  var colors = chart.color().title("Color scale");

  // Drawing function
  // selection represents the d3 selection (svg)
  // data is not the original set of records
  // but the result of the model map function
  chart.draw(function(selection, data) {
    // Define margins
    var margin = {
      top: globalMargin(),
      right: globalMargin(),
      bottom: globalMargin(),
      left: globalMargin()
    };
    //define title space
    var titleSpace = groups() == null ? 0 : 30;

    // Define common variables.
    // Find the overall maximum value
    var maxValue;

    if (sameScale()) {
      maxValue = d3.max(data, function(item) {
        return d3.max(item.values, function(d) {
          return d.size;
        });
      });
    }

    // Check consistency among categories and colors, save them all
    var allCategories = [];
    var allColors = [];
    data.forEach(function(item) {
      var temp_categories = item.values.map(function(val) {
        return val.category;
      });
      allCategories = allCategories.concat(temp_categories);

      // Same for color
      var temp_colors = item.values.map(function(val) {
        return val.color;
      });
      allColors = allColors.concat(temp_colors);
    });
    //keep uniques
    allCategories = d3.set(allCategories).values();
    allColors = d3.set(allColors).values();

    // svg size
    selection.attr("width", width()).attr("height", height());

    // define single barchart height,
    // depending on the number of bar charts
    var w = +width() - globalMargin() * 2,
      h = (+height() - globalMargin() * 2 - titleSpace * (data.length - 1)) / data.length;

    // Define scales
    var yScale = d3.scaleLinear().range([0, h / 2]);

    // Define color scale domain
    colors.domain(allColors);

    // Draw each bar chart
    data.forEach(function(item, index) {
      // Define y domain
      if (sameScale()) {
        yScale.domain([0, maxValue]);
      } else {
        yScale.domain([
          0,
          d3.max(item.values, function(d) {
            return d.size;
          })
        ]);
      }

      // Append a grupo containing axis and bars,
      // move it according the index
      barchart = selection
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + index * (h + titleSpace) + ")");

      // Draw title
      barchart
        .append("text")
        .attr("x", -margin.left)
        .attr("y", titleSpace - 7)
        .style("font-size", "10px")
        .style("font-family", "Arial, Helvetica")
        .text(item.key);

      // // Draw y axis
      // barchart.append("g")
      //     .attr("class", "y axis")
      //     .style("font-size", "10px")
      //     .style("font-family", "Arial, Helvetica")
      //     .attr("transform", "translate(0," + titleSpace + ")")
      //     .call(d3.axisLeft(yScale).ticks(h / 15));

      const translationGroup = barchart
        .append("g")
        .attr("transform", `translate(${w / 2}, ${height() / 2 + titleSpace})`);

      const rotatedBar = translationGroup
        .selectAll("g.bar")
        .data(item.values)
        .enter()
        .append("g")
        .attr("transform", (d, i, a) => `rotate(${(360 / a.length) * i}) translate(${-barWidth()}, 0)`);

      // Draw the bars
      rotatedBar
        .append("rect")
        .attr("class", "bar")
        .attr("width", barWidth())
        .attr("height", d => yScale(d.size) - innerCircle())
        .attr("x", barWidth() / 2)
        .attr("y", innerCircle())
        .style("stroke", d => colors()(d.color))
        .style("fill", d => colors()(d.color));

      // debug sh*t
      if (debug() === true) {
        rotatedBar
          .append("line")
          .attr("class", "line")
          .attr("x1", barWidth())
          .attr("y1", innerCircle())
          .attr("x2", barWidth())
          .attr("y2", d => yScale(d.size) - innerCircle())
          .style("stroke", "red")
          .style("stroke-width", 2);
      }

      const maxYValue = yScale(d3.max(item.values).size);

      const rotatedLabel = translationGroup
        .selectAll("g.label")
        .data(item.values)
        .enter()
        .append("g")
        .attr("transform", (d, i, a) => `rotate(${(360 / a.length) * i}) translate(0, ${h / 2 + 12})`);

      rotatedLabel
        .append("text")
        .attr("x", barWidth() / 2)
        .attr("y", 0)
        .attr("transform", "rotate(90)")
        .text(d => d.category.slice(0, 20));

      rotatedLabel
        .append("text")
        .attr("x", barWidth() / 2)
        .attr("y", 16)
        .attr("transform", "rotate(90)")
        .text(d => Math.round(d.size * 100) / 100);
    });

    // Set styles

    // d3.selectAll(".axis line, .axis path")
    //   .style("shape-rendering", "crispEdges")
    //   .style("fill", "none")
    //   .style("stroke", "#ccc");
  });
})();
