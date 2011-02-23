require 'bundler'
Bundler.require

auth_client=OAuth2::Client.new(ENV['client_id'],ENV['client_secret'],
	:site=>"https://foursquare.com",
	:authorize_path=>"/oauth2/authenticate",
	:access_token_path=>"/oauth2/access_token")
access_client=OAuth2::Client.new(ENV['client_id'],ENV['client_secret'],
	:site=>"https://api.foursquare.com/v2/",
	:parse_json=>true)

class Token
	include DataMapper::Resource
	property :token, String, :key=>true
end
configure do
	DataMapper.setup(:default, (ENV["DATABASE_URL"] || "sqlite3:///#{Dir.pwd}/development.sqlite3"))
	DataMapper.auto_upgrade!
end

get '/oauth/signup' do
	redirect auth_client.web_server.authorize_url(:redirect_uri=>ENV['callback_url'],:response_type=>"code")
end

get '/oauth/auth_grant' do
	#the end user will call this, with param ?code=<request_code>
	access_token = auth_client.web_server.get_access_token(params[:code],
		:redirect_uri => ENV['callback_url'],
		:grant_type=>"authorization_code")
	if access_token.nil?
		raise "error getting access token"
	else
		Token.create(:token=>access_token.token).save unless Token.get(access_token.token)
		redirect "/oauth/signup_success"
	end
end

get '/oauth/signup_success' do
	"Signup Sucessful!<br/><a href='/'>Return to main menu</a>"
end

class Hash
	def checkin_items
		self["response"]["checkins"]["items"]
	end
	def checkin_items=(thing)
		self["response"]["checkins"]["items"]=(thing)
	end
end
get '/all_checkins' do
	Token.all.map do |token_rec|
		access=OAuth2::AccessToken.new(access_client,token_rec.token)
		user=access.get("users/self")
		options={:limit=>100,:offset=>0,
			:beforeTimestamp=>params[:before],
			:afterTimestamp=>params[:after]}
		checkins=access.get("users/self/checkins",options)
		#TODO: cache some of this in database?
		if params[:after] && checkins.checkin_items.length >= options[:limit]
			begin
				options[:offset]+=options[:limit]
				get=access.get("users/self/checkins",options)
				#puts "get="
				#puts get
				checkins.checkin_items+= get.checkin_items
			end until get.checkin_items.length < options[:limit]
		end
		checkins.checkin_items.reject! {|x| x["createdAt"] < params[:after].to_i} if params[:after]
		checkins.checkin_items.reject! {|x| x["createdAt"] > params[:before].to_i} if params[:before]
		
		#TODO: this needs some handling for wrap-around lat/lngs
		#TODO: bounding box.
		user["response"].merge(checkins["response"])
	end.to_json
end

get '/tokens' do
	Token.all.map {|x| x.token}.to_json
end
get '/' do
	redirect '/index.html'
end
	