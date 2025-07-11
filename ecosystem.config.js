module.exports = {
	apps : [{
		name: 'farsight',
		script: 'index.js',
		watch: ['index.js', 'events', 'commands'],
		out_file: '/var/www/Farsight-RPG-BOT/logs/outputs.json',
		error_file: '/var/www/Farsight-RPG-BOT/logs/errors.json',
		log_type: 'json',
	}],

};
