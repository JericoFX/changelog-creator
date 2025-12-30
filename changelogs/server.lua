local Config = {
	Webhook = GetConvar("changelog_webhook", "false") == "false" and false or GetConvar("changelog_webhook", "false"), -- Native complains if you pass false as non-string, hacky fix
	FileName = GetConvar("changelog_filename", "changelog.json")
}

local function IsFilePresent(filename)
	local f = LoadResourceFile(GetCurrentResourceName(), filename)
	return f and true or false
end

CreateThread(function()
	if not Config.Webhook or not IsFilePresent(Config.FileName) then
		print("^1Could not find Webhook and/or Config. Ensure they are both present in your cfg!^7")
		return
	else
		print("^2Webhook and config found! Checking changelog info...^7")
	end

	-- MAIN CODE

	local fileContent = LoadResourceFile(GetCurrentResourceName(), Config.FileName)
	if not fileContent then
		print("^1Failed to load changelog file content.^7")
		return
	end

	local ok, Changelog = pcall(json.decode, fileContent) -- Convert the JSON into a lua table
	if not ok or type(Changelog) ~= "table" then
		print("^1Invalid changelog JSON. Aborting.^7")
		return
	end

	if type(Changelog.Version) ~= "string" or type(Changelog.DO_NOT_CHANGE_VER) ~= "string" or type(Changelog.Changes) ~= "table" then
		print("^1Changelog schema mismatch. Ensure Version, DO_NOT_CHANGE_VER, and Changes exist.^7")
		return
	end
	
	if Changelog.Version == Changelog.DO_NOT_CHANGE_VER then -- If versions match, kill the thread - no point running code past here
		print("^3No changelog difference, not posting.^7")
		return
	end

	-- Code past here will only run if there is a version diff

	local Changes = {
		Additions = {},
		Removals = {},
		Modifications = {},
		Misc = {}
	}

	for i=1, #Changelog.Changes do
		local Change = Changelog.Changes[i]
		if type(Change) ~= "string" then
			Change = tostring(Change)
		end
		local FirstChar = string.sub(Change, 1, 1)
		local NewChange = string.gsub(Change, FirstChar.." ", "")

		if FirstChar == "+" then
			table.insert(Changes.Additions, NewChange)
		elseif FirstChar == "-" then
			table.insert(Changes.Removals, NewChange)
		elseif FirstChar == "*" then
			table.insert(Changes.Modifications, NewChange)
		else
			table.insert(Changes.Misc, Change)
		end
	end

	local DiscordEmbed = {
		{
			title = "Changelog for version "..Changelog.Version,
			color = 16335900,
			fields = {},
			footer = {
				text = "Server Changelogs"
			}
		}
	}

	if #Changes.Additions > 0 then
		local str = ""
		for i=1, #Changes.Additions do 
			str = str.."• "..Changes.Additions[i].."\n"
		end
		if #str > 1024 then
			str = string.sub(str, 1, 1021).."..."
		end
		table.insert(DiscordEmbed[1].fields, {name = "Additions", value = str})
	end
	if #Changes.Removals > 0 then
		local str = ""
		for i=1, #Changes.Removals do 
			str = str.."• "..Changes.Removals[i].."\n"
		end
		if #str > 1024 then
			str = string.sub(str, 1, 1021).."..."
		end
		table.insert(DiscordEmbed[1].fields, {name = "Removals", value = str})
	end
	if #Changes.Modifications > 0 then
		local str = ""
		for i=1, #Changes.Modifications do 
			str = str.."• "..Changes.Modifications[i].."\n"
		end
		if #str > 1024 then
			str = string.sub(str, 1, 1021).."..."
		end
		table.insert(DiscordEmbed[1].fields, {name = "Modifications", value = str})
	end
	if #Changes.Misc > 0 then
		local str = ""
		for i=1, #Changes.Misc do 
			str = str.."• "..Changes.Misc[i].."\n"
		end
		if #str > 1024 then
			str = string.sub(str, 1, 1021).."..."
		end
		table.insert(DiscordEmbed[1].fields, {name = "Misc", value = str})
	end


	PerformHttpRequest(Config.Webhook, function(errorCode, resultData, resultHeaders)
		if errorCode >= 200 and errorCode < 300 then
			Changelog.DO_NOT_CHANGE_VER = Changelog.Version
			SaveResourceFile(GetCurrentResourceName(), Config.FileName, json.encode(Changelog, {indent = true}), -1)
			print("^2Changed Config Version!^7")
		else
			print(("^1Webhook post failed with status %s. Keeping version unchanged.^7"):format(errorCode))
		end
	end, "POST", json.encode({embeds = DiscordEmbed, allowed_mentions = {parse = {}}}), {["Content-Type"] = "application/json"})

	-- Now we've done the changelog, its time to change the ver so it doesnt repeatably send

end)
