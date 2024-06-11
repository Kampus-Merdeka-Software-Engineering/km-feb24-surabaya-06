// Color palette using RGBA format manually
const colorPalette = [
  'rgba(255, 182, 193, 1)',  // Light Pink
  'rgba(173, 216, 230, 1)',  // Light Blue
  'rgba(147, 112, 219, 1)',  // Medium Purple
  'rgba(0, 0, 150, 1)',      // Dark Blue
  'rgba(25, 25, 112, 1)',    // Midnight Blue
  'rgba(70, 130, 180, 1)'    // Steel Blue
];

// Event listener for hamburger menu
document.addEventListener("DOMContentLoaded", function () {
    const hamburgerMenu = document.getElementById("hamburgerMenu");
    const navbarMenu = document.getElementById("navbarMenu");

    hamburgerMenu.addEventListener("click", function () {
        navbarMenu.classList.toggle("active");
    });
});

// Fetch and process data from JSON files
document.addEventListener("DOMContentLoaded", function() {
    // Fetch data from Continent.json
    fetch('./data/Continent.json')
        .then(response => response.json())
        .then(data => {
            const productData = data;

            // Initialize DataTables
            $('#productTable').DataTable({
                data: productData,
                columns: [
                    { data: 'year' },
                    { data: 'Continent' },
                    { data: 'average_revenue' }
                ],
                // Add filtering features
                initComplete: function () {
                    this.api().columns().every(function () {
                        var column = this;
                        var header = $(column.header());
                        var select = $('<select><option value="">Filter</option></select>')
                            .appendTo(header)
                            .on('change', function () {
                                var val = $.fn.dataTable.util.escapeRegex($(this).val());
                                column.search(val ? '^' + val + '$' : '', true, false).draw();
                            });

                        column.data().unique().sort().each(function (d, j) {
                            select.append('<option value="' + d + '">' + d + '</option>');
                        });
                    });
                },
            });
        })
        .catch(error => console.error('Error fetching data:', error));

    // Fetch data from DashboardData.json and update HTML elements
    fetch('./data/DashboardData.json')
        .then(response => response.json())
        .then(data => {
            // Update HTML elements with data
            document.getElementById('totalRevenue').textContent = `$${data.Total_Revenue}`;
            document.getElementById('totalCustomers').textContent = data.Total_Customers;
            document.getElementById('totalOrders').textContent = data.Total_Orders;
        })
        .catch(error => console.error('Error fetching data:', error));

    // Fetch data from Average Rev per Continent per Year.json
    fetch('data/Average Rev per Continent per Year.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            console.log('Data fetched:', data); // Log the fetched data to verify

            // Sum up the average revenue, converting each value to an integer
            let totalAverageRevenue = data.reduce((sum, record) => sum + parseFloat(record.average_revenue), 0);

            // Convert the total to an integer (removing any decimal places)
            totalAverageRevenue = Math.floor(totalAverageRevenue);

            console.log('Total Average Revenue:', totalAverageRevenue); // Log the total to verify

            // Update HTML element with the total average revenue
            document.getElementById('avgRevenue').textContent = `$${totalAverageRevenue}`;
        })
        .catch(error => console.error('Error fetching data:', error));

    // Function to create a chart
    const createChart = (ctx, type, data, options) => {
        return new Chart(ctx, {
            type: type,
            data: data,
            options: options
        });
    };

    // Function to fetch data
    const fetchData = (url, callback) => {
        fetch(url)
            .then(response => {
                if (response.ok) {
                    return response.json();
                }
            })
            .then(data => {
                callback(data);
            });
    };

    // Fetch data for Average Revenue per Country and create a pie chart
    const pieSegmentCtx = document.getElementById('Average Revenue per Country').getContext('2d');
    fetch('./data/AverageRevperCountry.json')
        .then(response => response.json())
        .then(data => {
            const labels = data.map(row => row.Country);
            const revenues = data.map(row => parseFloat(row.average_revenue));
            const total = revenues.reduce((acc, val) => acc + val, 0);

            new Chart(pieSegmentCtx, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Average Revenue per Country',
                        data: revenues,
                        backgroundColor: colorPalette,
                        hoverOffset: 6
                    }]
                },
                options: {
                    responsive: true, // Set to true for responsive behavior
                    maintainAspectRatio: false, // Set to false to control canvas size
                    plugins: {
                        tooltip: { enabled: true },
                        legend: { display: true, position: 'right' },
                        datalabels: {
                            color: '#FFFFFF', // Text color for data labels
                            font: (context) => {
                                // Calculate font size based on chart width
                                const chartWidth = context.chart.width;
                                const baseSize = Math.round(chartWidth / 35);
                                return {
                                    weight: 'bold',
                                    size: baseSize > 0 ? baseSize : 0 // Ensure minimum size of 16
                                };
                            },
                                                        textStrokeColor: '#412B9A', // Stroke color for text
                            textStrokeWidth: 3, // Stroke width for text
                            formatter: (value, ctx) => {
                                let percentage = ((value / total) * 100).toFixed(2) + "%";
                                return percentage;
                            },
                            display: 'auto',
                            anchor: 'center',
                            align: 'center'
                        }
                    },
                    elements: { arc: { borderWidth: 0 } }
                },
                plugins: [ChartDataLabels] // Enable the datalabels plugin here
            });
        })
        .catch(error => console.error('Error fetching data:', error));

    // Fetch data for Average Revenue by Continent and create a line chart
    const AvgRevenueByContinentCtx = document.getElementById('Average Revenue by Continent').getContext('2d');

    fetchData('./data/Average Rev per Continent per Year.json', data => {
        const years = [...new Set(data.map(item => item.year))];
        const continents = ['NORTH AMERICA', 'EUROPE', 'AUSTRALIA'];

        // Populate year filter dropdown
        const yearFilter = document.getElementById('yearFilter');
        years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearFilter.appendChild(option);
        });

        // Initial chart rendering
        renderChart(data, 'all', continents, years);

        // Event listener for dropdown year change
        yearFilter.addEventListener('change', () => {
            const selectedYear = yearFilter.value;
            renderChart(data, selectedYear, continents, years);
        });
    });

    // Function to render the chart based on selected filters
    function renderChart(data, selectedYear, continents, years) {
        const filteredData = selectedYear === 'all' ? data : data.filter(item => item.year === selectedYear);

        const datasets = continents.map((continent, index) => {
            return {
                label: continent,
                data: years.map(year => {
                    const item = filteredData.find(d => d.Continent === continent && d.year === year);
                    return item ? parseFloat(item.average_revenue) : 0;
                }),
                backgroundColor: colorPalette[index % colorPalette.length],
                borderColor: colorPalette[index % colorPalette.length],
                borderWidth: 1.5,
                fill: false
            };
        });

        // Remove existing chart if it exists
        if (window.myChart) {
            window.myChart.destroy();
        }

        // Create a new line chart
        window.myChart = new Chart(AvgRevenueByContinentCtx, {
            type: 'line',
            data: {
                labels: years,
                datasets: datasets
            },
        });
    }

    // Fetch data for Average Revenue by Age Group and create a bar chart
    const AvgRevenueAgeGCtx = document.getElementById('Average Revenue by Age Group').getContext('2d');
    fetchData('./data/Average Rev per Age Group.json', data => {
        createChart(AvgRevenueAgeGCtx, 'bar', {
            labels: data.map(row => row.Age_Group),
            datasets: [{
                axis: 'y',
                label: 'Age Group',
                data: data.map(row => row.Average_Revenue),
                fill: false,
                backgroundColor: [
                    colorPalette[0], // Light Pink
                    colorPalette[1], // Light Blue
                    colorPalette[2], // Medium Purple
                    colorPalette[3]  // Dark Blue
                ],
                borderColor: [
                    colorPalette[0],
                    colorPalette[1],
                    colorPalette[2],
                    colorPalette[3]
                ],
                borderWidth: 1.5
            }]
        }, {
            indexAxis: 'y'
        });
    });

    // Fetch data for Average Revenue by Sub Category and create a bar chart
    const AvgRevenueBySubCategoryCtx = document.getElementById('Average Revenue by Sub Category').getContext('2d');
    fetchData('./data/Average Rev per Year, Sub Category, Continent.json', data => {
        const categories = [...new Set(data.map(item => item.Sub_Category))];
        const years = [...new Set(data.map(item => item.Year))];

        // Populate year filter dropdown
        const yearFilter = document.getElementById('subCategoryYearFilter');
        years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearFilter.appendChild(option);
        });

        // Initial chart rendering
        renderSubCategoryChart(data, 'all', categories, years);

        // Event listener for year dropdown change
        yearFilter.addEventListener('change', () => {
            const selectedYear = yearFilter.value;
            renderSubCategoryChart(data, selectedYear, categories, years);
        });
    });

    // Function to render the sub-category chart based on selected filters
    function renderSubCategoryChart(data, selectedYear, categories, years) {
        const filteredData = selectedYear === 'all' ? data : data.filter(item => item.Year === selectedYear);

        const datasets = categories.map((Sub_Category, index) => ({
            label: Sub_Category,
            data: years.map(year => {
                const item = filteredData.find(d => d.Sub_Category === Sub_Category && d.Year === year);
                return item ? parseFloat(item.Average_Revenue) : 0;
            }),
            backgroundColor: colorPalette[index % colorPalette.length],
            borderColor: colorPalette[index % colorPalette.length],
            borderWidth: 1.5
        }));

        // Remove existing chart if it exists
        if (window.subCategoryChart) {
            window.subCategoryChart.destroy();
        }

        // Create a new bar chart
        window.subCategoryChart = new Chart(AvgRevenueBySubCategoryCtx, {
            type: 'bar',
            data: {
                labels: years,
                datasets: datasets
            },
        });
    }
});
