fx_version 'cerulean'
use_experimental_fxv2_oal 'yes'
lua54 'yes'
games { 'rdr3', 'gta5' }
rdr3_warning 'I acknowledge that this is a prerelease build of RedM, and I am aware my resources *will* become incompatible once RedM ships.'

name 'changelog-creator'
author 'sadboilogan (Original)'
version '0.1'
license 'LGPL-3.0-or-later'

server_only 'yes'
server_scripts {
	"server.lua"
}
