{ pkgs }: {  
  environment.systemPackages = [
    pkgs.nodejs_20
  ];
	deps = [
    pkgs.nodejs-16_x
    pkgs.super
    pkgs.sudo
    pkgs.vim
    pkgs.nano
    pkgs.nodePackages.typescript-language-server
    pkgs.yarn
    pkgs.replitPackages.jest
	];
  allowUnfree = true;
}