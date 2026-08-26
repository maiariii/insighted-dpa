module.exports = {
  apps: [
    {
      name: "insighted-dpa-backend",
      script: "server/index.js",
      cwd: "/mnt/insighted-dpa",
      instances: 2,
      exec_mode: "cluster",
      watch: false,
      max_memory_restart: "600M",
      env: {
        NODE_ENV: "production",
        PORT: 5040
      },
      error_file: "/mnt/insighted-dpa/logs/err.log",
      out_file: "/mnt/insighted-dpa/logs/out.log",
      merge_logs: true,
      time: true
    }
  ]
};