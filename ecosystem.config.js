module.exports = {
	apps : [{
		name: 'farsight',
		script: 'index.js',
		watch: ['index.js', 'events', 'commands'],
		out_file: '/var/www/Farsight-RPG-BOT/logs/outputs.log',
		error_file: '/var/www/Farsight-RPG-BOT/logs/errors.log',
	}],

};
