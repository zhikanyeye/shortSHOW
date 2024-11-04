// script.js
document.addEventListener('DOMContentLoaded', function() {
    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            window.draamas = data; // 将数据存储在全局变量中
        })
        .catch(error => {
            console.error('Error fetching data:', error);
        });
});

function searchDramas() {
    var searchTerm = document.getElementById('searchBox').value.toLowerCase();
    var resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = ''; // 清空之前的结果

    var dramas = window.draamas; // 从全局变量中获取数据
    var found = false;

    dramas.forEach(function(drama) {
        if (drama.name.toLowerCase().includes(searchTerm) || drama.leadActor.toLowerCase().includes(searchTerm)) {
            found = true;
            var resultElement = document.createElement('div');
            resultElement.innerHTML = `<p>${drama.name} - 主演: ${drama.leadActor} <a href="${drama.link}" target="_blank">观看</a></p>`;
            resultsContainer.appendChild(resultElement);
        }
    });

    if (!found) {
        resultsContainer.innerHTML = '<p class="no-results">没有找到结果。如果您需要帮助，请联系站长。</p>';
    }
}
