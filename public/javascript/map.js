//global variables for now
map=undefined;
pins=[];
user_pins={};
the_time=undefined;
animation_pid=undefined
svg_xmlns="http://www.w3.org/2000/svg"
svg=undefined;


function map_initialize() {
	var usa_center = new google.maps.LatLng(39, -98);
	var boston_center = new google.maps.LatLng(42.360399,-71.057982);
	var myOptions = {
	zoom: 12,
	center: boston_center,
	mapTypeId: google.maps.MapTypeId.ROADMAP
	};
	map = new google.maps.Map(document.getElementById("map_canvas"),
		myOptions);
		
	svg=document.createElementNS(svg_xmlns,"svg");
	svg.style.position="absolute";
	svg.style.top="0px";
	document.documentElement.appendChild(svg);
	load_checkins();
}

//SIDE-EFFECT: clears Global pins
function load_checkins(){
	//clear the pins. have to destroy old first?
	pins=[];
	//get ajax
	xhr = new XMLHttpRequest();
	xhr.onreadystatechange=function(){
		if (xhr.readyState==4 && xhr.status==200){
			all_data=JSON.parse(xhr.responseText);
			setup_events(JSON.parse(xhr.responseText));
		}
	}
	//hardcoded, get all after february
	//TODO: make not hardcoded.
	xhr.open("GET","/all_checkins?after=1296518400",true);
	xhr.send(null);
	//callback the draw method
}

function setup_events(checkin_data){
	//put down one pin for everyone with at least one pin
	user_pins={}
	var container = document.getElementById("img_container");
	for (var i=0; i<checkin_data.length; i++){
		var name=checkin_data[i]["user"]["firstName"]; //TODO: ensure uniqueness
		var items=checkin_data[i]["checkins"]["items"]
		if (items.length > 0)
		{
			var first_item=items[items.length-1];
			var loc=first_item["venue"]["location"];
			var t=first_item["createdAt"];
			
			var img=document.createElement("img");
			img.src=checkin_data[i]["user"]["photo"];
			container.appendChild(img);
			
			var line=document.createElementNS(svg_xmlns,"line");
			line.setAttribute("x1",img.x);
			line.setAttribute("y1",img.y);
			line.setAttribute("x2",img.x);
			line.setAttribute("y2",img.y);
			line.setAttribute("style", "stroke:green;stroke-width:2");
			svg.appendChild(line);

			user_pins[name]={
				pin: create_pin(loc["lat"],loc["lng"],name,t),
				current_index: items.length, //start past end
				items: items,
				line: line,
				image:img
			};
			//user_pins[name]["pin"].setIcon(checkin_data[i]["user"]["photo"]);
			

			if (!the_time || the_time > t){
				the_time=t;
			}
		}
	}
	animation_pid=setInterval(update_animation,50);
}

function update_animation()
{
	step_pins(the_time);
	the_time+=3600;
	if (the_time>1298851200){
		clearInterval(animation_pid);
		alert("done!");
	}
}
function step_pins(time){
	for (var name in user_pins){
		var cur = user_pins[name];
		var i = cur["current_index"];
		if (i<=0){ //this is the last element, just go to the next user
			continue;
		}
		var next_time=cur["items"][i-1]["createdAt"];
		if (next_time<=time) //set the pin to the current location. lessthan/equal in case we accidentally skip over something.
		{
			var loc = cur["items"][i-1]["venue"]["location"]			
			//alert("moveto "+loc["lat"]+loc["lng"]);
			cur["pin"].setPosition(new google.maps.LatLng(loc["lat"],loc["lng"]));
			cur["pin"].setTitle(name+": "+next_time);
			var point = position_to_pixel(cur["pin"].getPosition());
			
			cur["line"].setAttribute("x1",cur["image"].x);
			cur["line"].setAttribute("y1",cur["image"].y);
			cur["line"].setAttribute("x2",point.x);
			cur["line"].setAttribute("y2",point.y);
			if (!cur["pin"].getMap()){
				cur["pin"].setMap(map);
			}
			cur["current_index"] -= 1;
		}
		else if (cur["pin"]){ //interpolate to the next
		}
	}
}


function create_pin(lat,lng,user,date){
	var loc=new google.maps.LatLng(lat,lng);
	//alert("pin on "+lat+","+lng);
	return new google.maps.Marker({
		position: loc,
		title: user+", "+date}
	);
}

//from http://stackoverflow.com/questions/2674392/how-to-access-google-maps-api-v3-markers-div-and-its-pixel-position
function position_to_pixel(pos){
	var scale = Math.pow(2, map.getZoom());
	var nw = new google.maps.LatLng(
		map.getBounds().getNorthEast().lat(),
		map.getBounds().getSouthWest().lng()
	);
	var worldCoordinateNW = map.getProjection().fromLatLngToPoint(nw);
	var worldCoordinate = map.getProjection().fromLatLngToPoint(pos);
	var pixelOffset = new google.maps.Point(
		Math.floor((worldCoordinate.x - worldCoordinateNW.x) * scale),
		Math.floor((worldCoordinate.y - worldCoordinateNW.y) * scale)
	);
	return pixelOffset;
}