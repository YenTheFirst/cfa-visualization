$(document).ready(function(){
	$.getJSON('/all_checkins',function(data){
		$('body').append(function(){
			return "<ul>"+$.map(data,function(entry,i){
				return "<li>"+entry["user"]["firstName"]+"<br/><ul>"+$.map(entry["checkins"]["items"].slice(0,5),function(checkin,j){
					loc=checkin["venue"]["location"];
					return ("<li>"+checkin["createdAt"]+": "+loc["lat"]+", "+loc["lng"]+"</li>")
				}).join("\n")+"</ul>"
			}).join("\n")+"</ul>"
		});
	});
});