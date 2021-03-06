var map;
var markers = [];
var locations = [];
const endpoint = 'locations.json';

function initMap() {
  fetch(endpoint)
  .then(blob => blob.json())
  .then(data => {
    for (var key in data) {
      if (data.hasOwnProperty(key)) {
        locations.push(data[key]);
      }
    }
    ko.applyBindings(new ViewModel());
  }).catch((error) => {
    if(error.message === 'Failed to fetch') {
      data.forEach(function(location) {
        locations.push(location);
      });
      ko.applyBindings(new ViewModel());
    } else {
      alert(error.message);
    }
  });
}


var ViewModel = function() {
  var self = this;
  largeInfowindow = new google.maps.InfoWindow();
  bounds = new google.maps.LatLngBounds();
  defaultIcon = createIcon('0091ff');
  highlightedIcon = createIcon('FFFF24');
  selectedIcon = createIcon('ff3300');

  //init observable filter text
  filterTerm = ko.observable("");
  currentMarker = null;
  //init map
  map = new google.maps.Map(document.getElementById('map'), {
    center: {lat: 23.69781, lng: 120.960515},
    zoom: 8
  });

  //mark map per location
  markMap();
  
  //filter marker and list item based on searchTerm provided
  ko.dependentObservable(function() {
    var search = filterTerm().toLowerCase();
    return ko.utils.arrayFilter(markers, function(marker) {
      if (marker.title.toLowerCase().indexOf(search) >= 0) {
        showMarker(marker);
        marker.showItem(true);
        return;
      } else {
        hideMarker(marker);
        marker.showItem(false);
        return;
      }
    });       
  }, self);

  // google.maps.event.addDomListener(window, 'resize', function() {
  //   map.fitBounds(bounds); // `bounds` is a `LatLngBounds` object
  // });
};


//responsive window resize
window.onresize = function() {
  var currCenter = map.getCenter();
  google.maps.event.trigger(map, 'resize');
  map.setCenter(currCenter);
};


function createInfoWindows(marker, infowindow) {
  //nested IF to ensure previous marker with info window rest its corresponding marker and list item color
  if(currentMarker !== null) {
    if(marker.id !== currentMarker.id) {
      currentMarker.setIcon(defaultIcon);
      currentMarker.action('');
    }
  }
  //setting the selected marker icon and trigger list item to have the same selected color
  marker.setIcon(selectedIcon);
  marker.action('selected');
  currentMarker = marker;
  weatherContentString = '';

  //only open infowindow if clicked on different marker or the previous infowindow was closed
  if (infowindow.marker != currentMarker || infowindow.closeclick) {
    infowindow.closeclick = false;
    infowindow.marker = marker;

    //calling weather api to get local weather condition
    fetch(marker.weatherapiurl)
      .then((resp) => resp.json())
      .then(function(data) {
        detail = data.current_observation;
        weatherContentString = '<ul style="text-align: center;border: 1px solid blue;padding:10px; margin-top: 10px;"><li>Temp: ' + detail.temp_f + '° F</li><li><img style="width: 25px" src="' + detail.icon_url + '">  ' + detail.icon + '</li></ul>';
        infowindow.setContent('<div>' + marker.title + '</div>' + weatherContentString);
      }).catch(function(error){
        weatherContentString = '<p style="text-align: center;padding:10px; margin-top: 10px;">Sorry! Weather Underground</p><p style="text-align: center;padding:10px; margin-top: 10px;">Could Not Be Loaded</p>';
        infowindow.setContent('<div>' + marker.title + '</div>' + weatherContentString);
      });

    infowindow.open(map, marker);
    
    //when infowindow is closed manually, list of things are reset to its default state
    infowindow.addListener('closeclick',function(){
      infowindow.closeclick = true;
      marker.setIcon(defaultIcon);
      currentMarker = null;
      marker.action('');
      map.setCenter({lat: 23.69781, lng: 120.960515});
      map.setZoom(8);
      filterTerm('');
    });
  }
}


//create marker for each location
function markMap() {
  for (var i = 0; i < locations.length; i++) {
    var position = locations[i].location;
    var title = locations[i].title;
    var marker = new google.maps.Marker({
      map: map,
      position: position,
      title: title,
      icon: defaultIcon,
      animation: google.maps.Animation.DROP,
      weatherapiurl: locations[i].weatherapiurl,
      id: i
    });
    //add and observe this value of marker to determine the visibility of its corresponding list item
    marker.showItem = ko.observable(true);
    //observe action such as mouseover, mouseleave and selected in order to apply style linkage between marker and list item
    marker.action = ko.observable('');
    markers.push(marker);
    marker.addListener('click', goToLocation);
    marker.addListener('mouseover', mouseOverListItem);
    marker.addListener('mouseout', mouseLeaveListItem);
    bounds.extend(markers[i].position);
  }
  map.fitBounds(bounds);
}


function createIcon(color) {
  var markerImage = new google.maps.MarkerImage(
    'http://chart.googleapis.com/chart?chst=d_map_spin&chld=1.15|0|'+ color +
    '|40|_|%E2%80%A2',
    new google.maps.Size(21, 34),
    new google.maps.Point(0, 0),
    new google.maps.Point(10, 34),
    new google.maps.Size(21,34));
  return markerImage;
}


function showMarker(marker) {
  marker.setMap(map);
}


function hideMarker(marker) {
  marker.setMap(null);
}


//when marker or list item is selected
//center marker and increase zoom level
function goToLocation() {
  createInfoWindows(this, largeInfowindow);
  map.setZoom(15);
  map.setCenter(this.getPosition());
}


//when mouse over marker or list item
//update obserable variable to show color linkage between list item and marker
function mouseOverListItem() {
  if(currentMarker !== null) {
    if(currentMarker.id != this.id) {
      this.setIcon(highlightedIcon);
      this.action('hovered');
    }
  } else {
    this.setIcon(highlightedIcon);
    this.action('hovered');
  }
}


//when mouse leave marker or list item
//update obserable variable to set marker or list item color to default color
function mouseLeaveListItem() {
  if(currentMarker !== null) {
    if(currentMarker.id != this.id) {
      this.setIcon(defaultIcon);
      this.action('');
    }
  } else {
    this.setIcon(defaultIcon);
    this.action('');
  }
}


//used to return correpsonding color for data-binded obserable element
function setBackground(event) {
  if(event === 'selected') {
    return '#ff3300';
  } else if (event === 'hovered') {
    return 'darkblue';
  }
}


//handles 
function errorhandler() {
  // console.log(this);
  alert('Google maps failed to load!\ncheck the api url');
}
