class Comment < ActiveRecord::Base
  attr_accessible :id, :body, :movie_id, :position, :updated_at, :created_at
  validates :body,     presence: true
  validates :movie_id, presence: true
  validates :position, presence: true
end
