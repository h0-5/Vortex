# Vortex Plugins

Plugin directories are independent workspace packages discovered from validated manifests. Core
owns lifecycle orchestration and provides scoped APIs; plugins do not receive the raw Discord
client, environment, filesystem, or database pool.
